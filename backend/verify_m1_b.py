"""
Manual verification script for Milestone 1 Engineer B.
Checks if models are correctly defined and linked to the metadata.
"""

from app.db.base import Base
import app.models  # Trigger imports

def verify_models():
    expected_tables = {
        "users", "workspaces", "workspace_members", "invites", # Engineer A
        "contacts", "companies", "tags", "contact_tags", "company_tags", # Engineer B CRM
        "business_hours", "api_keys" # Engineer B Settings
    }
    
    found_tables = set(Base.metadata.tables.keys())
    
    print(f"Checking for expected tables...")
    missing = expected_tables - found_tables
    if missing:
        print(f"[ERROR] Missing tables: {missing}")
    else:
        print(f"[OK] All {len(expected_tables)} tables are correctly defined in metadata.")
    
    # Check relationships
    from app.models.contact import Contact
    from app.models.tag import Tag
    
    print("\nChecking relationships...")
    if hasattr(Contact, "tags"):
        print("[OK] Contact has 'tags' relationship.")
    else:
        print("[ERROR] Contact is missing 'tags' relationship.")
        
    if hasattr(Tag, "contacts"):
        print("[OK] Tag has 'contacts' relationship.")
    else:
        print("[ERROR] Tag is missing 'contacts' relationship.")

if __name__ == "__main__":
    verify_models()
