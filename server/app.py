from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

app = Flask(__name__)
CORS(app)

# --- CONFIGURAÇÃO DO MYSQL ---
# ⚠️ COLOQUE A SENHA QUE VOCÊ CRIOU NO INSTALADOR AQUI! ⚠️
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '35953238',
    'database': 'yako'
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Tabela de usuários (MySQL usa AUTO_INCREMENT em vez de AUTOINCREMENT)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                is_pro BOOLEAN DEFAULT 0,
                pagamento VARCHAR(50) DEFAULT 'nenhum'
            )
        ''')
        
        # Tabela de academias
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS academies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                endereco TEXT NOT NULL,
                is_sponsored BOOLEAN DEFAULT 0
            )
        ''')

        # Tabela de mensagens (chat comunidade + direto)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                recipient_id INT NULL,
                user_name VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_chat_created (created_at),
                INDEX idx_chat_sender_recipient (user_id, recipient_id)
            )
        ''')

        try:
            cursor.execute('ALTER TABLE messages ADD COLUMN recipient_id INT NULL')
        except mysql.connector.Error:
            pass

        conn.commit()
        cursor.close()
        conn.close()
        print("Banco de dados MySQL conectado e tabelas verificadas!")
    except mysql.connector.Error as err:
        print(f"ERRO NO BANCO DE DADOS: {err}")

# Inicializa as tabelas ao ligar o servidor
init_db()

# --- ROTAS DE AUTENTICAÇÃO ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    nome = data.get('nome')
    email = data.get('email')
    senha = generate_password_hash(data.get('senha'))

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # MySQL usa %s em vez de ? para variáveis
        cursor.execute('INSERT INTO users (nome, email, senha) VALUES (%s, %s, %s)', (nome, email, senha))
        conn.commit()
        return jsonify({"success": True, "message": "Usuário cadastrado com sucesso!"}), 201
    except mysql.connector.Error as err:
        return jsonify({"error": "E-mail já cadastrado ou erro no servidor"}), 400
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, nome, senha, is_pro FROM users WHERE email = %s', (data.get('email'),))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if user and check_password_hash(user[2], data.get('senha')):
        return jsonify({
            "success": True, 
            "user": {"id": user[0], "nome": user[1], "is_pro": bool(user[3])}
        })
    return jsonify({"error": "E-mail ou senha incorretos"}), 401

# --- MANTENDO AS ROTAS DO ADMIN ---

@app.route('/api/admin/stats')
def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM users')
    total = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM users WHERE is_pro = 1')
    pros = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return jsonify({"total_atletas": total, "atletas_pro": pros, "faturamento_estimado": pros * 49.90})


@app.route('/api/ranking/users', methods=['GET'])
def ranking_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, nome, email, is_pro FROM users ORDER BY nome ASC')
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    users = [
        {
            'id': r[0],
            'unique_key': f"mysql-{r[0]}",
            'nome': r[1],
            'email': r[2] or '',
            'is_pro': bool(r[3]),
            'cidade': '',
            'modalidade': '',
            'academia': 'Sem academia',
        }
        for r in rows
    ]
    return jsonify({'users': users})


@app.route('/api/chat/users', methods=['GET'])
def chat_users():
    exclude_id = request.args.get('exclude_id', type=int)

    conn = get_db_connection()
    cursor = conn.cursor()

    if exclude_id:
        cursor.execute('SELECT id, nome FROM users WHERE id != %s ORDER BY nome ASC', (exclude_id,))
    else:
        cursor.execute('SELECT id, nome FROM users ORDER BY nome ASC')

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    users = [{'id': r[0], 'nome': r[1]} for r in rows]
    return jsonify({'users': users})


@app.route('/api/chat', methods=['GET'])
def get_chat_messages():
    user_id = request.args.get('user_id', type=int)
    peer_id = request.args.get('peer_id', type=int)

    conn = get_db_connection()
    cursor = conn.cursor()

    if user_id and peer_id:
        cursor.execute('''
            SELECT id, user_id, recipient_id, user_name, message, created_at
            FROM messages
            WHERE (user_id = %s AND recipient_id = %s)
               OR (user_id = %s AND recipient_id = %s)
            ORDER BY id ASC
        ''', (user_id, peer_id, peer_id, user_id))
    elif user_id:
        cursor.execute('''
            SELECT id, user_id, recipient_id, user_name, message, created_at
            FROM messages
            WHERE recipient_id IS NULL OR user_id = %s OR recipient_id = %s
            ORDER BY id ASC
        ''', (user_id, user_id))
    else:
        cursor.execute('''
            SELECT id, user_id, recipient_id, user_name, message, created_at
            FROM messages
            WHERE recipient_id IS NULL
            ORDER BY id ASC
        ''')

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    messages = [
        {
            'id': r[0],
            'user_id': r[1],
            'recipient_id': r[2],
            'user_name': r[3],
            'message': r[4],
            'created_at': r[5].isoformat() if hasattr(r[5], 'isoformat') else str(r[5]),
        }
        for r in rows
    ]
    return jsonify({'messages': messages})


@app.route('/api/chat', methods=['POST'])
def send_chat_message():
    data = request.json or {}
    user_id = data.get('user_id')
    recipient_id = data.get('recipient_id')
    user_name = data.get('user_name', 'Anonimo')
    message = data.get('message', '').strip()

    if not message:
        return jsonify({'error': 'Mensagem vazia'}), 400

    created_at = datetime.utcnow()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO messages (user_id, recipient_id, user_name, message, created_at) VALUES (%s, %s, %s, %s, %s)',
        (user_id, recipient_id, user_name, message, created_at)
    )
    conn.commit()
    inserted_id = cursor.lastrowid
    cursor.close()
    conn.close()

    return jsonify({
        'success': True,
        'id': inserted_id,
        'user_id': user_id,
        'recipient_id': recipient_id,
        'user_name': user_name,
        'message': message,
        'created_at': created_at.isoformat(),
    }), 201

if __name__ == '__main__':
    app.run(port=5000, debug=True)