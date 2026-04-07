import base64
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class SymmetricEncryption:
    """Utility for encrypting/decrypting strings using a key derived from SECRET_KEY."""
    
    _fernet = None

    @classmethod
    def _get_fernet(cls) -> Fernet:
        """Initialize and return a Fernet instance using derived key."""
        if cls._fernet is None:
            # Derive a 32-byte key from SECRET_KEY
            salt = b"resolve-ai-token-salt"  # Static salt for consistent derivation
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))
            cls._fernet = Fernet(key)
        return cls._fernet

    @classmethod
    def encrypt(cls, plain_text: str) -> str:
        """Encrypt a string and return base64 encoded result."""
        if not plain_text:
            return ""
        try:
            fernet = cls._get_fernet()
            encrypted_bytes = fernet.encrypt(plain_text.encode())
            return encrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise RuntimeError("Failed to encrypt data") from e

    @classmethod
    def decrypt(cls, encrypted_text: str) -> str:
        """Decrypt a base64 encoded string."""
        if not encrypted_text:
            return ""
        try:
            fernet = cls._get_fernet()
            decrypted_bytes = fernet.decrypt(encrypted_text.encode())
            return decrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise RuntimeError("Failed to decrypt data — check SECRET_KEY consistency") from e

# Alias for easy access
encrypt_string = SymmetricEncryption.encrypt
decrypt_string = SymmetricEncryption.decrypt
