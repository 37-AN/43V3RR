import pytest
from app.services.audit_service import write_audit_log


def test_write_audit_log_no_db():
    with pytest.raises(AttributeError):
        write_audit_log(None, "system", "test", "entity", "1", {})
