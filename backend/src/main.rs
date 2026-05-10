use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tower_http::cors::{Any, CorsLayer};
use bcrypt::{hash, verify, DEFAULT_COST};

struct AppState {
    db: Mutex<Connection>,
}

#[tokio::main]
async fn main() {
    let db = Connection::open("gcare.db").unwrap();
    
    // Initialize DB tables
    db.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            full_name TEXT NOT NULL,
            service_location TEXT,
            status TEXT NOT NULL
        )",
        [],
    ).unwrap();

    // Insert mock admin if not exists
    let admin_hash = hash("password123", DEFAULT_COST).unwrap();
    let _ = db.execute(
        "INSERT OR IGNORE INTO users (id, email, password_hash, role, full_name, service_location, status) 
         VALUES (1, 'admin@gcare.com', ?1, 'admin', 'Super Admin', '', 'approved')",
        params![admin_hash],
    );

    let state = Arc::new(AppState {
        db: Mutex::new(db),
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/members", get(get_members))
        .route("/members/:id/status", post(update_status))
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Server running on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}

#[derive(Deserialize)]
struct RegisterReq {
    email: String,
    password: String,
    full_name: String,
    service_location: String,
}

async fn register(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterReq>,
) -> impl IntoResponse {
    let hash_result = hash(&payload.password, DEFAULT_COST).unwrap();
    let db = state.db.lock().unwrap();
    
    let result = db.execute(
        "INSERT INTO users (email, password_hash, role, full_name, service_location, status)
         VALUES (?1, ?2, 'service_member', ?3, ?4, 'pending')",
        params![payload.email, hash_result, payload.full_name, payload.service_location],
    );

    match result {
        Ok(_) => (StatusCode::OK, "Registered successfully").into_response(),
        Err(_) => (StatusCode::BAD_REQUEST, "Email already exists").into_response(),
    }
}

#[derive(Deserialize)]
struct LoginReq {
    email: String,
    password: String,
}

#[derive(Serialize)]
struct UserRes {
    id: i64,
    email: String,
    role: String,
    full_name: String,
    service_location: String,
    status: String,
}

async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginReq>,
) -> impl IntoResponse {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT id, email, password_hash, role, full_name, service_location, status FROM users WHERE email = ?1").unwrap();
    
    let user_opt = stmt.query_row(params![payload.email], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?, // hash
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
            row.get::<_, String>(5)?,
            row.get::<_, String>(6)?,
        ))
    });

    match user_opt {
        Ok(user) => {
            let valid = verify(&payload.password, &user.2).unwrap_or(false);
            if !valid {
                return (StatusCode::UNAUTHORIZED, "Invalid email or password").into_response();
            }
            if user.6 != "approved" && user.3 != "admin" {
                return (StatusCode::UNAUTHORIZED, "Account not approved by admin yet.").into_response();
            }
            
            let res = UserRes {
                id: user.0,
                email: user.1,
                role: user.3,
                full_name: user.4,
                service_location: user.5,
                status: user.6,
            };
            (StatusCode::OK, Json(serde_json::json!({ "user": res }))).into_response()
        }
        Err(_) => (StatusCode::UNAUTHORIZED, "Invalid email or password").into_response(),
    }
}

async fn get_members(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT id, email, role, full_name, service_location, status FROM users WHERE role = 'service_member'").unwrap();
    let member_iter = stmt.query_map([], |row| {
        Ok(UserRes {
            id: row.get(0)?,
            email: row.get(1)?,
            role: row.get(2)?,
            full_name: row.get(3)?,
            service_location: row.get(4)?,
            status: row.get(5)?,
        })
    }).unwrap();

    let mut members = Vec::new();
    for m in member_iter {
        members.push(m.unwrap());
    }

    (StatusCode::OK, Json(members)).into_response()
}

#[derive(Deserialize)]
struct StatusUpdateReq {
    status: String,
}

async fn update_status(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
    Json(payload): Json<StatusUpdateReq>,
) -> impl IntoResponse {
    let db = state.db.lock().unwrap();
    let result = db.execute(
        "UPDATE users SET status = ?1 WHERE id = ?2",
        params![payload.status, id],
    );

    if result.is_ok() {
        StatusCode::OK.into_response()
    } else {
        StatusCode::INTERNAL_SERVER_ERROR.into_response()
    }
}
