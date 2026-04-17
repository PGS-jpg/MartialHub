from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os
import requests
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

PLAN_PRICES = {
    'athlete_pro': 29.90,
    'academy_premium': 149.90,
}

PLAN_TITLES = {
    'athlete_pro': 'Plano Atleta PRO',
    'academy_premium': 'Plano Academia Premium',
}


def build_user_payload(row):
    return {
        'id': row[0],
        'nome': row[1],
        'is_pro': bool(row[2]),
        'is_academy_pro': bool(row[3]),
    }


def apply_plan_to_user(user_id, plan_code):
    if plan_code not in PLAN_PRICES:
        return None, ('plano inválido', 400)

    conn = sqlite3.connect('yako.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, nome, is_pro, is_academy_pro FROM users WHERE id = ?', (user_id,))
    existing = cursor.fetchone()

    if not existing:
        conn.close()
        return None, ('usuário não encontrado', 404)

    if plan_code == 'athlete_pro':
        cursor.execute('UPDATE users SET is_pro = 1, pagamento = ? WHERE id = ?', ('athlete_pro', user_id))
    elif plan_code == 'academy_premium':
        cursor.execute('UPDATE users SET is_academy_pro = 1, pagamento = ? WHERE id = ?', ('academy_premium', user_id))

    conn.commit()
    cursor.execute('SELECT id, nome, is_pro, is_academy_pro FROM users WHERE id = ?', (user_id,))
    updated = cursor.fetchone()
    conn.close()

    return build_user_payload(updated), None

# Configuração do Banco de Dados
def init_db():
    conn = sqlite3.connect('yako.db')
    cursor = conn.cursor()
    # Tabela de usuários (Atletas/Admins)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            is_pro BOOLEAN DEFAULT 0,
            is_academy_pro BOOLEAN DEFAULT 0,
            pagamento TEXT DEFAULT 'nenhum',
            bio TEXT DEFAULT '',
            academia TEXT DEFAULT '',
            cidade TEXT DEFAULT '',
            modalidade TEXT DEFAULT '',
            estilo TEXT DEFAULT ''
        )
    ''')
    # Tabela de academias
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS academies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            endereco TEXT NOT NULL,
            cidade TEXT DEFAULT '',
            modalidade TEXT DEFAULT '',
            lat REAL DEFAULT 0,
            lng REAL DEFAULT 0,
            is_sponsored BOOLEAN DEFAULT 0
        )
    ''')

    # Migração de schema para tabelas existentes (SQLite pode precisar coluna extra)
    try:
        cursor.execute('ALTER TABLE academies ADD COLUMN cidade TEXT DEFAULT ""')
    except:
        pass
    try:
        cursor.execute('ALTER TABLE academies ADD COLUMN modalidade TEXT DEFAULT ""')
    except:
        pass
    try:
        cursor.execute('ALTER TABLE academies ADD COLUMN lat REAL DEFAULT 0')
    except:
        pass
    try:
        cursor.execute('ALTER TABLE academies ADD COLUMN lng REAL DEFAULT 0')
    except:
        pass
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN is_academy_pro BOOLEAN DEFAULT 0')
    except:
        pass

    # Tabela de mensagens do chat geral (todos os usuários)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            user_name TEXT,
            message TEXT,
            created_at TEXT
        )
    ''')

    # Tabela de torneios/campeonatos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tournaments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            modality TEXT NOT NULL,
            city TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            status TEXT DEFAULT 'upcoming',
            level TEXT DEFAULT 'intermediario',
            prize_pool REAL DEFAULT 0,
            max_participants INTEGER DEFAULT 100,
            description TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Tabela de lutas (matches) dentro de um torneio
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER NOT NULL,
            athlete1_id INTEGER,
            athlete1_name TEXT NOT NULL,
            athlete2_id INTEGER,
            athlete2_name TEXT NOT NULL,
            modality TEXT NOT NULL,
            round INTEGER DEFAULT 1,
            round_order INTEGER DEFAULT 1,
            status TEXT DEFAULT 'scheduled',
            winner_id INTEGER,
            duration_seconds INTEGER DEFAULT 0,
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(tournament_id) REFERENCES tournaments(id)
        )
    ''')

    # Tabela de placar em tempo real
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scoreboards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL UNIQUE,
            athlete1_score INTEGER DEFAULT 0,
            athlete2_score INTEGER DEFAULT 0,
            athlete1_advantages INTEGER DEFAULT 0,
            athlete2_advantages INTEGER DEFAULT 0,
            current_round INTEGER DEFAULT 1,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'not_started',
            FOREIGN KEY(match_id) REFERENCES matches(id)
        )
    ''')

    # Tabela de regras por modalidade
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS modality_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            modality TEXT UNIQUE NOT NULL,
            point_types TEXT NOT NULL,
            max_rounds INTEGER DEFAULT 3,
            round_duration_seconds INTEGER DEFAULT 300,
            description TEXT DEFAULT ''
        )
    ''')

    # Inserir regras padrão por modalidade
    cursor.execute('SELECT COUNT(*) FROM modality_rules WHERE modality = "bjj"')
    if cursor.fetchone()[0] == 0:
        rules_data = [
            ('bjj', 'takedown:2,knee_on_belly:2,guard_pass:3,mount:4,back_control:4', 3, 300, 'BJJ - Positional points'),
            ('muay_thai', 'punch:1,kick:1,knee:2,elbow:1,clinch_control:1', 5, 180, 'Muay Thai - Strike based'),
            ('boxe', 'knock_down:1,judge_point:1', 12, 180, 'Boxe - Judge scoring'),
            ('judo', 'waza_ari:1,ippon:2', 1, 300, 'Judô - Throw points'),
            ('taekwondo', 'punch:1,kick:1,kick_head:2', 3, 120, 'Taekwondo - PSS Sensor'),
            ('mma', 'takedown:2,strike:1,submission_defense:1', 5, 300, 'MMA - 10 point system'),
        ]
        for modality, points, rounds, duration, desc in rules_data:
            cursor.execute(
                'INSERT INTO modality_rules (modality, point_types, max_rounds, round_duration_seconds, description) VALUES (?, ?, ?, ?, ?)',
                (modality, points, rounds, duration, desc)
            )

    # Inserir dados de teste de torneios
    cursor.execute('SELECT COUNT(*) FROM tournaments')
    tournament_count = cursor.fetchone()[0]
    
    if tournament_count == 0:
        tournaments_data = [
            ('Interbrasil BJJ 2026', 'bjj', 'São Paulo, SP', '2026-03-25', '09:00', 'avancado', 50000.00, 150, 'Maior campeonato de BJJ do Brasil', 'live'),
            ('Campeonato Muay Thai RJ', 'muay_thai', 'Rio de Janeiro, RJ', '2026-03-28', '14:00', 'intermediario', 30000.00, 100, 'Campeonato estadual de Muay Thai', 'upcoming'),
            ('Torneio de Boxe MG', 'boxe', 'Belo Horizonte, MG', '2026-03-22', '18:00', 'iniciante', 20000.00, 92, 'Seletiva para campeonato nacional', 'finished'),
            ('Judô Copa Brasil', 'judo', 'Brasília, DF', '2026-03-20', '10:00', 'profissional', 80000.00, 156, 'Copa Brasil de Judô', 'live'),
            ('MMA Open SP', 'mma', 'São Paulo, SP', '2026-03-15', '19:00', 'intermediario', 45000.00, 80, 'Open MMA sem restrições', 'finished'),
            ('BJJ Sub-21 BR', 'bjj', 'Salvador, BA', '2026-04-02', '08:30', 'iniciante', 25000.00, 120, 'Campeonato sub-21 de BJJ', 'upcoming'),
            ('Muay Thai Elite', 'muay_thai', 'Porto Alegre, RS', '2026-04-10', '20:00', 'avancado', 60000.00, 64, 'Elite dos lutadores sul', 'upcoming'),
            ('Grand Prix Boxe', 'boxe', 'Curitiba, PR', '2026-04-05', '17:00', 'profissional', 70000.00, 96, 'Grand Prix boxe profissional', 'upcoming'),
        ]
        for name, modality, city, date, time, level, prize, max_p, desc, status in tournaments_data:
            cursor.execute(
                'INSERT INTO tournaments (name, modality, city, date, time, level, prize_pool, max_participants, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                (name, modality, city, date, time, level, prize, max_p, desc, status)
            )
        
        # Inserir matches de teste para os torneios ao vivo
        cursor.execute('SELECT id FROM tournaments WHERE status = "live" LIMIT 2')
        live_tournaments = cursor.fetchall()
        
        for tournament_row in live_tournaments:
            tournament_id = tournament_row[0]
            matches_data = [
                (tournament_id, 'Rafael Silva', 'João Santos', 'live', 1, 1),
                (tournament_id, 'Ana Costa', 'Maria Oliveira', 'scheduled', 1, 2),
                (tournament_id, 'Carlos Pereira', 'Lucas Ferreira', 'scheduled', 2, 1),
            ]
            for t_id, a1, a2, match_status, round_num, order in matches_data:
                cursor.execute(
                    'SELECT modality FROM tournaments WHERE id = ?',
                    (t_id,)
                )
                modality = cursor.fetchone()[0]
                
                cursor.execute(
                    'INSERT INTO matches (tournament_id, athlete1_name, athlete2_name, modality, round, round_order, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    (t_id, a1, a2, modality, round_num, order, match_status)
                )
                
                # Se o match está ao vivo, cria um scoreboard
                if match_status == 'live':
                    match_id = cursor.lastrowid
                    cursor.execute(
                        'INSERT INTO scoreboards (match_id, athlete1_score, athlete2_score, current_round, status) VALUES (?, ?, ?, ?, ?)',
                        (match_id, 3, 2, 2, 'in_progress')
                    )

    conn.commit()
    conn.close()

init_db()

# --- ROTAS DE AUTENTICAÇÃO ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    nome = data.get('nome')
    email = data.get('email')
    senha = generate_password_hash(data.get('senha'))

    try:
        conn = sqlite3.connect('yako.db')
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)', (nome, email, senha))
        conn.commit()
        return jsonify({"success": True, "message": "Usuário cadastrado!"}), 201
    except:
        return jsonify({"error": "E-mail já cadastrado"}), 400
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = sqlite3.connect('yako.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, nome, senha, is_pro, is_academy_pro FROM users WHERE email = ?', (data.get('email'),))
    user = cursor.fetchone()
    conn.close()

    if user and check_password_hash(user[2], data.get('senha')):
        return jsonify({
            "success": True, 
            "user": {
                "id": user[0],
                "nome": user[1],
                "is_pro": bool(user[3]),
                "is_academy_pro": bool(user[4]),
                "bio": ""
            }
        })
    return jsonify({"error": "Credenciais inválidas"}), 401

# --- MANTENDO AS ROTAS DO ADMIN (Adaptadas para o Banco) ---

def haversine(lat1, lng1, lat2, lng2):
    from math import radians, sin, cos, sqrt, atan2
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

@app.route('/api/academies', methods=['GET'])
def get_academies():
    lat = request.args.get('lat', default=None, type=float)
    lng = request.args.get('lng', default=None, type=float)
    radius = request.args.get('radius', default=None, type=float)

    conn = sqlite3.connect('yako.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, nome, endereco, cidade, modalidade, lat, lng, is_sponsored FROM academies')
    rows = cursor.fetchall()
    conn.close()

    academies = []
    for r in rows:
        acad = {
            'id': r[0],
            'nome': r[1],
            'endereco': r[2],
            'cidade': r[3],
            'modalidade': r[4],
            'lat': r[5],
            'lng': r[6],
            'is_sponsored': bool(r[7])
        }
        if lat is not None and lng is not None and radius is not None:
            acad['distance_km'] = haversine(lat, lng, acad['lat'], acad['lng'])
            if acad['distance_km'] > radius:
                continue
        academies.append(acad)

    if lat is not None and lng is not None:
        academies.sort(key=lambda x: x.get('distance_km', float('inf')))

    return jsonify({'academies': academies})

@app.route('/api/academies', methods=['POST'])
def create_academy():
    data = request.json or {}
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'error': 'usuário não autenticado para cadastrar academia'}), 401

    conn = sqlite3.connect('yako.db')
    cursor = conn.cursor()
    cursor.execute('SELECT is_academy_pro FROM users WHERE id = ?', (user_id,))
    owner = cursor.fetchone()

    if not owner:
        conn.close()
        return jsonify({'error': 'usuário não encontrado'}), 404

    if not bool(owner[0]):
        conn.close()
        return jsonify({'error': 'cadastro de academias liberado apenas para plano premium de academia'}), 403

    nome = data.get('nome')
    endereco = data.get('endereco')
    cidade = data.get('cidade', '')
    modalidade = data.get('modalidade', '')
    lat = data.get('lat', 0)
    lng = data.get('lng', 0)
    is_sponsored = data.get('is_sponsored', False)

    if not nome or not endereco:
        conn.close()
        return jsonify({'error': 'nome e endereco obrigatórios'}), 400

    cursor.execute('INSERT INTO academies (nome, endereco, cidade, modalidade, lat, lng, is_sponsored) VALUES (?, ?, ?, ?, ?, ?, ?)',
                   (nome, endereco, cidade, modalidade, lat, lng, int(bool(is_sponsored))))
    conn.commit()
    inserted_id = cursor.lastrowid
    conn.close()

    return jsonify({'success': True, 'id': inserted_id}), 201

@app.route('/api/plans/academy/subscribe', methods=['POST'])
def subscribe_academy_plan():
    data = request.json or {}
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'error': 'user_id obrigatório'}), 400

    updated, err = apply_plan_to_user(user_id, 'academy_premium')
    if err:
        return jsonify({'error': err[0]}), err[1]

    return jsonify({
        'success': True,
        'message': 'Plano premium de academia ativado com sucesso',
        'plan': {
            'code': 'academy_premium',
            'name': 'Academia Premium',
            'price_monthly': 149.90,
        },
        'user': {
            'id': updated['id'],
            'nome': updated['nome'],
            'is_pro': updated['is_pro'],
            'is_academy_pro': updated['is_academy_pro'],
        }
    })


@app.route('/api/plans/athlete/subscribe', methods=['POST'])
def subscribe_athlete_plan():
    data = request.json or {}
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'error': 'user_id obrigatório'}), 400

    updated, err = apply_plan_to_user(user_id, 'athlete_pro')
    if err:
        return jsonify({'error': err[0]}), err[1]

    return jsonify({
        'success': True,
        'message': 'Plano PRO de atleta ativado com sucesso',
        'plan': {
            'code': 'athlete_pro',
            'name': 'Atleta PRO',
            'price_monthly': 29.90,
        },
        'user': {
            'id': updated['id'],
            'nome': updated['nome'],
            'is_pro': updated['is_pro'],
            'is_academy_pro': updated['is_academy_pro'],
        }
    })


@app.route('/api/payments/checkout', methods=['POST'])
def create_checkout():
    data = request.json or {}
    user_id = data.get('user_id')
    plan_code = data.get('plan_code')

    if not user_id:
        return jsonify({'error': 'user_id obrigatório'}), 400

    if plan_code not in PLAN_PRICES:
        return jsonify({'error': 'plan_code inválido'}), 400

    frontend_base = os.getenv('FRONTEND_BASE_URL', 'http://localhost:3000').rstrip('/')
    backend_base = os.getenv('BACKEND_BASE_URL', 'http://localhost:5000').rstrip('/')

    # Fallback útil para desenvolvimento sem token configurado
    access_token = os.getenv('MERCADO_PAGO_ACCESS_TOKEN', '').strip()
    if not access_token:
        simulated_url = f"{frontend_base}/pagamento/sucesso?simulated=1&user_id={user_id}&plan={plan_code}"
        return jsonify({
            'success': True,
            'checkout_url': simulated_url,
            'simulated': True,
            'message': 'MERCADO_PAGO_ACCESS_TOKEN não configurado. Checkout simulado habilitado.'
        })

    preference_payload = {
        'items': [
            {
                'title': PLAN_TITLES[plan_code],
                'quantity': 1,
                'currency_id': 'BRL',
                'unit_price': PLAN_PRICES[plan_code],
            }
        ],
        'external_reference': f"{user_id}:{plan_code}",
        'back_urls': {
            'success': f"{frontend_base}/pagamento/sucesso?user_id={user_id}&plan={plan_code}",
            'failure': f"{frontend_base}/pagamento/falha?user_id={user_id}&plan={plan_code}",
            'pending': f"{frontend_base}/pagamento/pendente?user_id={user_id}&plan={plan_code}",
        },
        'auto_return': 'approved',
        'notification_url': f"{backend_base}/api/payments/webhook",
    }

    try:
        res = requests.post(
            'https://api.mercadopago.com/checkout/preferences',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json',
            },
            json=preference_payload,
            timeout=15,
        )
        mp_data = res.json()
        if res.status_code >= 400:
            return jsonify({'error': 'erro ao criar checkout no Mercado Pago', 'details': mp_data}), 502

        checkout_url = mp_data.get('init_point') or mp_data.get('sandbox_init_point')
        return jsonify({'success': True, 'checkout_url': checkout_url, 'simulated': False})
    except Exception as exc:
        return jsonify({'error': 'falha ao conectar no provedor de pagamento', 'details': str(exc)}), 502


@app.route('/api/payments/confirm', methods=['POST'])
def confirm_payment():
    data = request.json or {}
    user_id = data.get('user_id')
    plan_code = data.get('plan_code')

    if not user_id or not plan_code:
        return jsonify({'error': 'user_id e plan_code são obrigatórios'}), 400

    updated, err = apply_plan_to_user(user_id, plan_code)
    if err:
        return jsonify({'error': err[0]}), err[1]

    return jsonify({
        'success': True,
        'message': 'Pagamento confirmado e plano ativado',
        'user': updated,
    })


@app.route('/api/payments/webhook', methods=['POST'])
def payment_webhook():
    # Hook preparado para evolução; neste momento registramos o evento e devolvemos 200.
    payload = request.json or {}
    print('Mercado Pago webhook recebido:', payload)
    return jsonify({'received': True})


@app.route('/api/plans/catalog', methods=['GET'])
def plans_catalog():
    return jsonify({
        'plans': [
            {
                'code': 'free',
                'name': 'Free',
                'audience': 'athlete',
                'price_monthly': 0,
                'features': [
                    '3 desafios por dia',
                    'Ranking básico',
                    'Anúncios ativos'
                ]
            },
            {
                'code': 'athlete_pro',
                'name': 'Atleta PRO',
                'audience': 'athlete',
                'price_monthly': 29.90,
                'features': [
                    'Desafios ilimitados',
                    'Sem anúncios',
                    'Destaque no ranking'
                ]
            },
            {
                'code': 'academy_premium',
                'name': 'Academia Premium',
                'audience': 'academy',
                'price_monthly': 149.90,
                'features': [
                    'Cadastro de academias',
                    'Selo de academia premium',
                    'Prioridade na busca'
                ]
            }
        ]
    })

@app.route('/api/academies/batch', methods=['POST'])
def create_academies_batch():
    academies = request.json.get('academies', [])
    if not isinstance(academies, list):
        return jsonify({'error': 'academies deve ser uma lista'}), 400

    conn = sqlite3.connect('yako.db')
    cursor = conn.cursor()
    inserted = 0
    for acad in academies:
        cursor.execute('INSERT INTO academies (nome, endereco, cidade, modalidade, lat, lng, is_sponsored) VALUES (?, ?, ?, ?, ?, ?, ?)',
                       (acad.get('name', ''), acad.get('endereco', ''), acad.get('city', ''), acad.get('modalidade', ''), acad.get('lat', 0), acad.get('lng', 0), int(bool(acad.get('isSponsored', False)))))
        inserted += 1
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'inserted': inserted}), 201

@app.route('/api/chat', methods=['GET'])
def get_chat_messages():
    conn = sqlite3.connect('yako.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, user_id, user_name, message, created_at FROM messages ORDER BY id ASC')
    rows = cursor.fetchall()
    conn.close()

    messages = [
        {
            'id': r[0],
            'user_id': r[1],
            'user_name': r[2],
            'message': r[3],
            'created_at': r[4]
        }
        for r in rows
    ]
    return jsonify({'messages': messages})


@app.route('/api/chat', methods=['POST'])
def send_chat_message():
    data = request.json
    user_id = data.get('user_id')
    user_name = data.get('user_name', 'Anônimo')
    message = data.get('message', '').strip()

    if not message:
        return jsonify({'error': 'Mensagem vazia'}), 400

    from datetime import datetime
    created_at = datetime.utcnow().isoformat()

    conn = sqlite3.connect('yako.db')
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO messages (user_id, user_name, message, created_at) VALUES (?, ?, ?, ?)',
        (user_id, user_name, message, created_at)
    )
    conn.commit()
    inserted_id = cursor.lastrowid
    conn.close()

    return jsonify({'success': True, 'id': inserted_id, 'user_id': user_id, 'user_name': user_name, 'message': message, 'created_at': created_at}), 201


@app.route('/api/admin/stats')
def get_stats():
    conn = sqlite3.connect('yako.db')
    cursor = conn.cursor()
    total = cursor.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    pros = cursor.execute('SELECT COUNT(*) FROM users WHERE is_pro = 1').fetchone()[0]
    academy_pros = cursor.execute('SELECT COUNT(*) FROM users WHERE is_academy_pro = 1').fetchone()[0]
    conn.close()
    return jsonify({
        'total_atletas': total,
        'atletas_pro': pros,
        'academias_pro': academy_pros,
        'faturamento_estimado': (pros * 29.90) + (academy_pros * 149.90)
    })

@app.route('/api/user/profile', methods=['PUT'])
def update_profile():
    data = request.json
    user_id = data.get('user_id')
    nome = data.get('nome')
    academia = data.get('academia')
    cidade = data.get('cidade')
    modalidade = data.get('modalidade')
    estilo = data.get('estilo')
    bio = data.get('bio')
    
    conn = sqlite3.connect('yako.db')
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE users 
        SET nome = ?, academia = ?, cidade = ?, modalidade = ?, estilo = ?, bio = ? 
        WHERE id = ?
    ''', (nome, academia, cidade, modalidade, estilo, bio, user_id))
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "message": "Perfil atualizado!"})

# Registrar rotas de eventos
from routes_events import register_event_routes
register_event_routes(app)

if __name__ == '__main__':
    app.run(port=5000, debug=True)
