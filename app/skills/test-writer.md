# Test Writer

icon: checklist

> Tự động tạo unit test toàn diện cho code

## Usage

Sử dụng lệnh `/write_test` để tạo test cho code.

## Prompt

Hãy viết unit test cho đoạn code sau:

**Yêu cầu**:
1. Sử dụng framework test phù hợp (Jest, Vitest, pytest, etc.)
2. Test cases cần cover:
   - Happy path (trường hợp thành công)
   - Edge cases (biên)
   - Error cases (lỗi)
   - Boundary values (giá trị biên)
3. Mỗi test case có tên mô tả rõ ràng
4. Arrange-Act-Assert pattern
5. Có comments giải thích logic test

**Định dạng output**:
```[language]
// Test code here
```

Giải thích tại sao chọn các test cases này.
