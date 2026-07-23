from paddleocr import PaddleOCR

ocr = PaddleOCR(
    lang="en",
    use_textline_orientation=True
)

result = ocr.predict(r"D:\Downloads\demoAadhar.jpg")

print(result)