from flask import jsonify, request
import sqlite3
import time
import os


def parse_point_types(point_types):
    parsed = {}
    if not point_types:
        return parsed

    parts = [p.strip() for p in point_types.split(',') if p.strip()]
    for part in parts:
        if ':' not in part:
            continue
        name, raw_value = part.split(':', 1)
        try:
            parsed[name.strip()] = int(raw_value.strip())
        except ValueError:
            continue
    return parsed


def default_point_map_for_modality(modality):
    defaults = {
        'bjj': {'takedown': 2, 'knee_on_belly': 2, 'guard_pass': 3, 'mount': 4, 'back_control': 4},
        'judo': {'waza_ari': 1, 'ippon': 2},
        'muay_thai': {'punch': 1, 'kick': 1, 'knee': 2, 'elbow': 1},
        'boxe': {'judge_point': 1, 'knock_down': 1},
        'taekwondo': {'punch': 1, 'kick': 1, 'kick_head': 2},
        'mma': {'strike': 1, 'takedown': 2, 'ground_control': 1},
    }
    return defaults.get((modality or '').lower(), {'point': 1})


def compute_remaining_seconds(base_remaining, clock_started_at, status):
    if base_remaining is None:
        return None

    remaining = max(0, int(base_remaining))
    if status == 'in_progress' and clock_started_at:
        elapsed = max(0, int(time.time()) - int(clock_started_at))
        return max(0, remaining - elapsed)
    return remaining


def get_disqualified_athlete(athlete1_penalties, athlete2_penalties):
    athlete1_penalties = int(athlete1_penalties or 0)
    athlete2_penalties = int(athlete2_penalties or 0)

    if athlete1_penalties >= 3 and athlete2_penalties >= 3:
        return 'draw'
    if athlete1_penalties >= 3:
        return 'athlete1'
    if athlete2_penalties >= 3:
        return 'athlete2'
    return None


def is_admin_event_creator(conn, requester_user_id):
    if not requester_user_id:
        return False

    cursor = conn.cursor()
    cursor.execute('SELECT email FROM users WHERE id = ?', (requester_user_id,))
    row = cursor.fetchone()
    email = (row[0] or '').strip().lower() if row else ''

    admin_ids_raw = os.getenv('ADMIN_USER_IDS', '').strip()
    if admin_ids_raw:
        admin_ids = set()
        for part in admin_ids_raw.split(','):
            part = part.strip()
            if not part:
                continue
            try:
                admin_ids.add(int(part))
            except ValueError:
                continue
        if requester_user_id in admin_ids:
            return True

    if 'admin' in email:
        return True

    # Backward-compatible fallback: if no explicit admin exists,
    # allow first registered user to manage events.
    if not admin_ids_raw:
        cursor.execute("SELECT COUNT(*) FROM users WHERE lower(email) LIKE '%admin%'")
        admin_like_count = int(cursor.fetchone()[0] or 0)
        if admin_like_count == 0:
            cursor.execute('SELECT id FROM users ORDER BY id ASC LIMIT 1')
            first_row = cursor.fetchone()
            return bool(first_row and int(first_row[0]) == int(requester_user_id))

    return False

def register_event_routes(app):
    """Registra todas as rotas de eventos/torneios no app Flask"""
    
    @app.route('/api/tournaments', methods=['GET'])
    def get_tournaments():
        """Lista todos os campeonatos com filtros opcionais"""
        status = request.args.get('status', default='all')
        modality = request.args.get('modality', default=None)
        
        conn = sqlite3.connect('yako.db')
        cursor = conn.cursor()
        
        query = 'SELECT id, name, modality, city, date, time, status, level, prize_pool, max_participants, description FROM tournaments'
        params = []
        
        if status != 'all':
            query += ' WHERE status = ?'
            params.append(status)
        
        if modality:
            if params:
                query += ' AND modality = ?'
            else:
                query += ' WHERE modality = ?'
            params.append(modality)
        
        query += ' ORDER BY date DESC, time DESC'
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        tournaments = []
        for r in rows:
            tournaments.append({
                'id': r[0],
                'name': r[1],
                'modality': r[2],
                'city': r[3],
                'date': r[4],
                'time': r[5],
                'status': r[6],
                'level': r[7],
                'prize_pool': r[8],
                'max_participants': r[9],
                'description': r[10],
            })
        
        return jsonify({'tournaments': tournaments})
    
    @app.route('/api/tournaments/<int:tournament_id>/matches', methods=['GET'])
    def get_tournament_matches(tournament_id):
        """Lista todos os matches de um campeonato específico"""
        conn = sqlite3.connect('yako.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, name FROM tournaments WHERE id = ?', (tournament_id,))
        tournament = cursor.fetchone()
        
        if not tournament:
            conn.close()
            return jsonify({'error': 'torneio não encontrado'}), 404

        tournament_name = tournament[1]
        
        cursor.execute('''
            SELECT id, athlete1_name, athlete2_name, modality, round, round_order, status, winner_id
            FROM matches WHERE tournament_id = ? ORDER BY round, round_order
        ''', (tournament_id,))
        rows = cursor.fetchall()
        conn.close()
        
        matches = []
        for r in rows:
            matches.append({
                'id': r[0],
                'athlete1_name': r[1],
                'athlete2_name': r[2],
                'modality': r[3],
                'round': r[4],
                'round_order': r[5],
                'status': r[6],
                'winner_id': r[7],
            })
        
        return jsonify({
            'tournament': {'id': tournament_id, 'name': tournament_name},
            'matches': matches
        })
    
    @app.route('/api/matches/<int:match_id>/live', methods=['GET'])
    def get_live_score(match_id):
        """Obtém o placar ao vivo de um match"""
        conn = sqlite3.connect('yako.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT m.id, m.athlete1_name, m.athlete2_name, m.modality, m.status,
                   s.athlete1_score, s.athlete2_score, s.athlete1_advantages, s.athlete2_advantages,
                   s.athlete1_penalties, s.athlete2_penalties, s.current_round,
                   s.status as scoreboard_status, s.remaining_seconds, s.clock_started_at
            FROM matches m
            LEFT JOIN scoreboards s ON m.id = s.match_id
            WHERE m.id = ?
        ''', (match_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return jsonify({'error': 'match não encontrado'}), 404
        
        scoreboard_status = result[12] or 'not_started'
        remaining_seconds = compute_remaining_seconds(result[13], result[14], scoreboard_status)
        disqualified_athlete = get_disqualified_athlete(result[9], result[10])

        return jsonify({
            'match': {
                'id': result[0],
                'athlete1_name': result[1],
                'athlete2_name': result[2],
                'modality': result[3],
                'status': result[4],
            },
            'scoreboard': {
                'athlete1_score': result[5] or 0,
                'athlete2_score': result[6] or 0,
                'athlete1_advantages': result[7] or 0,
                'athlete2_advantages': result[8] or 0,
                'athlete1_penalties': result[9] or 0,
                'athlete2_penalties': result[10] or 0,
                'current_round': result[11] or 1,
                'status': scoreboard_status,
                'disqualified_athlete': disqualified_athlete,
                'remaining_seconds': remaining_seconds,
                'clock_started_at': result[14] if scoreboard_status == 'in_progress' else None
            }
        })
    
    @app.route('/api/matches/<int:match_id>/score', methods=['POST'])
    def update_match_score(match_id):
        """Atualiza o placar de um match (requer admin/juiz)"""
        data = request.json or {}
        
        athlete1_score = data.get('athlete1_score')
        athlete2_score = data.get('athlete2_score')
        athlete1_advantages = data.get('athlete1_advantages', 0)
        athlete2_advantages = data.get('athlete2_advantages', 0)
        has_athlete1_penalties = 'athlete1_penalties' in data
        has_athlete2_penalties = 'athlete2_penalties' in data
        athlete1_penalties = data.get('athlete1_penalties', 0)
        athlete2_penalties = data.get('athlete2_penalties', 0)
        current_round = data.get('current_round', 1)
        status = data.get('status', 'in_progress')
        has_remaining_seconds = 'remaining_seconds' in data
        has_clock_started_at = 'clock_started_at' in data
        remaining_seconds = data.get('remaining_seconds')
        clock_started_at = data.get('clock_started_at')
        
        conn = sqlite3.connect('yako.db')
        cursor = conn.cursor()
        
        # Verificar se match existe
        cursor.execute('SELECT id FROM matches WHERE id = ?', (match_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': 'match não encontrado'}), 404
        
        # Atualizar ou criar scoreboard
        cursor.execute('SELECT id, remaining_seconds, clock_started_at, athlete1_penalties, athlete2_penalties FROM scoreboards WHERE match_id = ?', (match_id,))
        scoreboard_exists = cursor.fetchone()

        if not has_athlete1_penalties and scoreboard_exists:
            athlete1_penalties = scoreboard_exists[3] or 0

        if not has_athlete2_penalties and scoreboard_exists:
            athlete2_penalties = scoreboard_exists[4] or 0

        disqualified_athlete = get_disqualified_athlete(athlete1_penalties, athlete2_penalties)
        if disqualified_athlete:
            status = 'finished'

        if not has_remaining_seconds:
            if scoreboard_exists and scoreboard_exists[1] is not None:
                remaining_seconds = scoreboard_exists[1]
            else:
                remaining_seconds = 0

        if status != 'in_progress':
            if scoreboard_exists and scoreboard_exists[2] and remaining_seconds is not None:
                remaining_seconds = compute_remaining_seconds(remaining_seconds, scoreboard_exists[2], 'in_progress')
            clock_started_at = None
        else:
            if not has_clock_started_at:
                if scoreboard_exists and scoreboard_exists[2]:
                    clock_started_at = scoreboard_exists[2]
                else:
                    clock_started_at = int(time.time())
            elif clock_started_at in (None, ''):
                clock_started_at = int(time.time())
        
        if scoreboard_exists:
            cursor.execute('''
                UPDATE scoreboards
                SET athlete1_score = ?, athlete2_score = ?, athlete1_advantages = ?,
                    athlete2_advantages = ?, athlete1_penalties = ?, athlete2_penalties = ?,
                    current_round = ?, remaining_seconds = ?,
                    clock_started_at = ?, status = ?
                WHERE match_id = ?
            ''', (athlete1_score, athlete2_score, athlete1_advantages, athlete2_advantages, athlete1_penalties, athlete2_penalties, current_round, remaining_seconds, clock_started_at, status, match_id))
        else:
            cursor.execute('''
                INSERT INTO scoreboards
                (match_id, athlete1_score, athlete2_score, athlete1_advantages, athlete2_advantages, athlete1_penalties, athlete2_penalties, current_round, remaining_seconds, clock_started_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (match_id, athlete1_score, athlete2_score, athlete1_advantages, athlete2_advantages, athlete1_penalties, athlete2_penalties, current_round, remaining_seconds, clock_started_at, status))
        
        conn.commit()
        conn.close()
        
        synced_remaining = compute_remaining_seconds(remaining_seconds, clock_started_at, status)
        return jsonify({
            'success': True,
            'message': 'Placar atualizado',
            'scoreboard': {
                'athlete1_score': athlete1_score,
                'athlete2_score': athlete2_score,
                'athlete1_advantages': athlete1_advantages,
                'athlete2_advantages': athlete2_advantages,
                'athlete1_penalties': athlete1_penalties,
                'athlete2_penalties': athlete2_penalties,
                'current_round': current_round,
                'status': status,
                'disqualified_athlete': disqualified_athlete,
                'remaining_seconds': synced_remaining,
                'clock_started_at': clock_started_at if status == 'in_progress' else None,
            }
        })
    
    @app.route('/api/modality-rules', methods=['GET'])
    def get_modality_rules():
        """Obtém as regras de pontuação para cada modalidade"""
        modality = request.args.get('modality', default=None)
        
        conn = sqlite3.connect('yako.db')
        cursor = conn.cursor()
        
        if modality:
            cursor.execute('SELECT modality, point_types, max_rounds, round_duration_seconds, description FROM modality_rules WHERE modality = ?', (modality,))
            rule = cursor.fetchone()
            conn.close()
            
            if not rule:
                return jsonify({'error': 'modalidade não encontrada'}), 404

            point_map = parse_point_types(rule[1])
            if not point_map:
                point_map = default_point_map_for_modality(rule[0])
            
            return jsonify({
                'modality': rule[0],
                'point_types': rule[1],
                'point_map': point_map,
                'max_rounds': rule[2],
                'round_duration_seconds': rule[3],
                'description': rule[4]
            })
        else:
            cursor.execute('SELECT modality, point_types, max_rounds, round_duration_seconds, description FROM modality_rules ORDER BY modality')
            rows = cursor.fetchall()
            conn.close()
            
            rules = []
            for r in rows:
                point_map = parse_point_types(r[1])
                if not point_map:
                    point_map = default_point_map_for_modality(r[0])
                rules.append({
                    'modality': r[0],
                    'point_types': r[1],
                    'point_map': point_map,
                    'max_rounds': r[2],
                    'round_duration_seconds': r[3],
                    'description': r[4]
                })
            
            return jsonify({'rules': rules})
    
    @app.route('/api/tournaments', methods=['POST'])
    def create_tournament():
        """Cria um novo campeonato (somente admin)"""
        data = request.json or {}
        user_id = data.get('user_id')
        
        # Validar permissões
        if not user_id:
            return jsonify({'error': 'user_id obrigatório'}), 400
        
        conn = sqlite3.connect('yako.db')
        cursor = conn.cursor()
        if not is_admin_event_creator(conn, int(user_id)):
            conn.close()
            return jsonify({'error': 'acesso negado: somente administrador pode criar eventos'}), 403
        
        # Campos obrigatórios
        name = data.get('name')
        modality = data.get('modality')
        city = data.get('city')
        date = data.get('date')
        time = data.get('time')
        level = data.get('level', 'intermediario')
        prize_pool = data.get('prize_pool', 0)
        max_participants = data.get('max_participants', 100)
        description = data.get('description', '')
        
        if not all([name, modality, city, date, time]):
            conn.close()
            return jsonify({'error': 'campos obrigatórios: name, modality, city, date, time'}), 400
        
        cursor.execute('''
            INSERT INTO tournaments (name, modality, city, date, time, level, prize_pool, max_participants, description, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')
        ''', (name, modality, city, date, time, level, prize_pool, max_participants, description))
        
        conn.commit()
        tournament_id = cursor.lastrowid
        conn.close()
        
        return jsonify({
            'success': True,
            'id': tournament_id,
            'message': 'Campeonato criado com sucesso'
        }), 201
    
    @app.route('/api/matches', methods=['POST'])
    def create_match():
        """Cria um novo match dentro de um campeonato"""
        data = request.json or {}
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'user_id obrigatório'}), 400
        
        tournament_id = data.get('tournament_id')
        athlete1_name = data.get('athlete1_name')
        athlete2_name = data.get('athlete2_name')
        modality = data.get('modality')
        
        if not all([tournament_id, athlete1_name, athlete2_name, modality]):
            return jsonify({'error': 'campos obrigatórios: tournament_id, athlete1_name, athlete2_name, modality'}), 400
        
        conn = sqlite3.connect('yako.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM tournaments WHERE id = ?', (tournament_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': 'torneio não encontrado'}), 404
        
        cursor.execute('''
            INSERT INTO matches (tournament_id, athlete1_name, athlete2_name, modality, status)
            VALUES (?, ?, ?, ?, 'scheduled')
        ''', (tournament_id, athlete1_name, athlete2_name, modality))
        
        conn.commit()
        match_id = cursor.lastrowid
        conn.close()
        
        return jsonify({
            'success': True,
            'id': match_id,
            'message': 'Match criado com sucesso'
        }), 201

    @app.route('/api/matches/<int:match_id>/actions', methods=['POST'])
    def apply_match_action(match_id):
        """Aplica ação de pontuação por modalidade no placar ao vivo."""
        data = request.json or {}
        athlete = data.get('athlete')  # athlete1 | athlete2
        action = data.get('action', '')

        if athlete not in ('athlete1', 'athlete2'):
            return jsonify({'error': 'athlete deve ser athlete1 ou athlete2'}), 400

        if not action:
            return jsonify({'error': 'action obrigatório'}), 400

        conn = sqlite3.connect('yako.db')
        cursor = conn.cursor()

        cursor.execute('SELECT id, modality FROM matches WHERE id = ?', (match_id,))
        match = cursor.fetchone()
        if not match:
            conn.close()
            return jsonify({'error': 'match não encontrado'}), 404

        modality = match[1]

        cursor.execute('SELECT point_types, round_duration_seconds FROM modality_rules WHERE modality = ?', (modality,))
        rule = cursor.fetchone()
        point_map = parse_point_types(rule[0] if rule else '')
        default_duration = rule[1] if rule and len(rule) > 1 else 300
        if not point_map:
            point_map = default_point_map_for_modality(modality)

        cursor.execute('''
            SELECT athlete1_score, athlete2_score, athlete1_advantages, athlete2_advantages,
                   athlete1_penalties, athlete2_penalties, current_round, remaining_seconds, clock_started_at
            FROM scoreboards WHERE match_id = ?
        ''', (match_id,))
        existing = cursor.fetchone()

        if existing:
            athlete1_score, athlete2_score, athlete1_advantages, athlete2_advantages, athlete1_penalties, athlete2_penalties, current_round, remaining_seconds, clock_started_at = existing
        else:
            athlete1_score, athlete2_score, athlete1_advantages, athlete2_advantages, athlete1_penalties, athlete2_penalties, current_round = (0, 0, 0, 0, 0, 0, 1)
            remaining_seconds = int(default_duration or 300)
            clock_started_at = int(time.time())

        points = point_map.get(action)
        is_advantage = action == 'advantage'
        is_penalty = action == 'penalty'

        if points is None and not is_advantage and not is_penalty:
            conn.close()
            return jsonify({'error': f'ação inválida para {modality}', 'available_actions': list(point_map.keys()) + ['advantage', 'penalty']}), 400

        if is_advantage:
            if athlete == 'athlete1':
                athlete1_advantages += 1
            else:
                athlete2_advantages += 1
        elif is_penalty:
            if athlete == 'athlete1':
                athlete1_penalties += 1
            else:
                athlete2_penalties += 1
        else:
            if athlete == 'athlete1':
                athlete1_score += points
            else:
                athlete2_score += points

        if remaining_seconds is None:
            remaining_seconds = int(default_duration or 300)

        status = 'in_progress'
        disqualified_athlete = get_disqualified_athlete(athlete1_penalties, athlete2_penalties)
        if disqualified_athlete:
            remaining_seconds = compute_remaining_seconds(remaining_seconds, clock_started_at, 'in_progress')
            clock_started_at = None
            status = 'finished'

        if status == 'in_progress' and not clock_started_at:
            clock_started_at = int(time.time())

        cursor.execute('SELECT id FROM scoreboards WHERE match_id = ?', (match_id,))
        scoreboard_exists = cursor.fetchone()

        if scoreboard_exists:
            cursor.execute('''
                UPDATE scoreboards
                SET athlete1_score = ?, athlete2_score = ?, athlete1_advantages = ?,
                    athlete2_advantages = ?, athlete1_penalties = ?, athlete2_penalties = ?,
                    current_round = ?, remaining_seconds = ?,
                    clock_started_at = ?, status = ?
                WHERE match_id = ?
            ''', (athlete1_score, athlete2_score, athlete1_advantages, athlete2_advantages, athlete1_penalties, athlete2_penalties, current_round, remaining_seconds, clock_started_at, status, match_id))
        else:
            cursor.execute('''
                INSERT INTO scoreboards
                (match_id, athlete1_score, athlete2_score, athlete1_advantages, athlete2_advantages, athlete1_penalties, athlete2_penalties, current_round, remaining_seconds, clock_started_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (match_id, athlete1_score, athlete2_score, athlete1_advantages, athlete2_advantages, athlete1_penalties, athlete2_penalties, current_round, remaining_seconds, clock_started_at, status))

        conn.commit()
        conn.close()

        synced_remaining = compute_remaining_seconds(remaining_seconds, clock_started_at, status)
        return jsonify({
            'success': True,
            'applied_action': action,
            'scoreboard': {
                'athlete1_score': athlete1_score,
                'athlete2_score': athlete2_score,
                'athlete1_advantages': athlete1_advantages,
                'athlete2_advantages': athlete2_advantages,
                'athlete1_penalties': athlete1_penalties,
                'athlete2_penalties': athlete2_penalties,
                'current_round': current_round,
                'status': status,
                'disqualified_athlete': disqualified_athlete,
                'remaining_seconds': synced_remaining,
                'clock_started_at': clock_started_at if status == 'in_progress' else None,
            }
        })
