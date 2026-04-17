import sqlite3
import os
from werkzeug.security import generate_password_hash

db_path = os.path.join(os.path.dirname(__file__), "martialhub.db")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Verificar se a tabela existe
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if cursor.fetchone() is None:
        print("Tabela 'users' não existe!")
        conn.close()
        exit(1)
    
    # Inserir usuário de teste
    nome = "Test User"
    email = "test@example.com"
    senha_hash = generate_password_hash("password123")
    
    # Tentar remover usuário anterior (se existir)
    cursor.execute("DELETE FROM users WHERE email = ?", (email,))
    
    cursor.execute("INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)",
                   (nome, email, senha_hash))
    conn.commit()
    
    print(f"✓ Usuário '{email}' criado com sucesso!")
    print(f"  Senha: password123")
    
    # Verificar
    cursor.execute("SELECT id, email FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    if user:
        print(f"  ID: {user[0]}, Email: {user[1]}")
    
    conn.close()
except Exception as e:
    print(f"✗ Erro: {e}")
    import traceback
    traceback.print_exc()
