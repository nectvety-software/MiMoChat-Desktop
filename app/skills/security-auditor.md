# Security Auditor

icon: security

> Kiểm tra bảo mật code và tìm lỗ hổng tiềm ẩn

## Usage

Sử dụng lệnh `/security` để audit bảo mật code.

## Prompt

Hãy audit bảo mật cho đoạn code sau:

**Kiểm tra các lỗ hổng OWASP Top 10**:
1. Injection (SQL, XSS, Command)
2. Broken Authentication
3. Sensitive Data Exposure
4. XXE
5. Broken Access Control
6. Security Misconfiguration
7. Insecure Deserialization
8. Using Components with Known Vulnerabilities

**Output**:
1. **Mức độ nghiêm trọng**: Critical/High/Medium/Low
2. **Vulnerability**: Mô tả lỗ hổng
3. **Vị trí**: Dòng code cụ thể
4. **Cách exploit**: Cách khai thác (để hiểu)
5. **Fix**: Code fix cụ thể
6. **Prevention**: Cách phòng tránh

Luôn tuân thủ security best practices.
