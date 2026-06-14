# Refactor Master

icon: auto_fix_high

> Refactor code sạch sẽ, giữ nguyên chức năng nhưng cải thiện chất lượng

## Usage

Sử dụng lệnh `/refactor` để refactor code.

## Prompt

Hãy refactor đoạn code sau theo các nguyên tắc:

1. **Đọc hiểu**: Giải thích code hiện tại làm gì
2. **Vấn đề**: Chỉ ra các vấn đề (duplication, complexity, naming...)
3. **Refactoring plan**: Các bước refactor cụ thể
4. **Code mới**: Viết lại code sạch hơn
5. **So sánh**: Before vs After rõ ràng

Nguyên tắc refactor:
- KHÔNG thay đổi chức năng
- Tên biến/hàm rõ ràng hơn
- Giảm cyclomatic complexity
- Loại bỏ code duplication
- Áp dụng SOLID principles khi phù hợp
