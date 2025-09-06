class Config:
    SQLALCHEMY_DATABASE_URI = 'mysql://root:@localhost/sentimind_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = '872c0c34b043e21f9c7b36340ab6c1d89a477c739ffef90caa28646f06bf71a5'
    JWT_SECRET_KEY = SECRET_KEY
