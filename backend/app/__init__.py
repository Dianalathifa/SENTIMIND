from flask import Flask, jsonify, request # Import 'request'
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv
import os

import pymysql

pymysql.install_as_MySQLdb()

from .config import Config

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()

def create_app():
    load_dotenv()

    app = Flask(__name__)

    app.config.from_object(Config)

    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:@localhost/sentimind_db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = '872c0c34b043e21f9c7b36340ab6c1d89a477c739ffef90caa28646f06bf71a5'

    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    @app.before_request
    def handle_options_preflight():
        if request.method == 'OPTIONS':
            response = jsonify({})

            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
            response.headers.add('Access-Control-Max-Age', '86400') # Cache preflight selama 24 jam
            return response, 200

    @jwt.unauthorized_loader
    def custom_unauthorized_response(callback):
        return jsonify({
            "error": "Token tidak ditemukan atau tidak valid"
        }), 401

    from app.models import Admin
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        return Admin.query.filter_by(id=identity).first()

    from .routes import main
    app.register_blueprint(main)

    from .content_routes import content
    app.register_blueprint(content)

    from .scraping_routes import scraping_bp
    app.register_blueprint(scraping_bp)

    from .public_routes import public_bp
    app.register_blueprint(public_bp)

    return app

__all__ = ['create_app', 'db']

if __name__ == '__main__':
    app_instance = create_app()
    with app_instance.app_context():
        db.create_all()
        print("Database tables created/checked.")
    app_instance.run(debug=True, port=5000)

