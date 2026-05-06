
#sum of 2 numbers
print("\nTask 1: sum of 2 numbers\n")
a = float(input("Enter first number: "))
b = float(input("Enter second number: "))
print(f"Sum: {a + b}")


#prime number check
print("\nTask 2: checking if a number is prime\n")
n = int(input("Enter a number: "))

if n < 2:
    print(f"{n} is not a  prime number")
else:
    is_prime = all(n % i != 0 for i in range(2, int(n**0.5) + 1))
    print(f"{n} is {'prime' if is_prime else 'Not prime'}")


#calculator
print("\nTask 3: calculator\n")
class Calculator:
    def add(self, a, b):
        return a + b

    def subtract(self, a, b):
        return a - b

    def multiply(self, a, b):
        return a * b

    def divide(self, a, b):
        if b == 0:
            return "division by zero is not allowed"
        return a / b

calc = Calculator()

a = float(input("Enter first number: "))
b = float(input("Enter second number: "))

print("Choose operation:")
print("  1. Add")
print("  2. Subtract")
print("  3. Multiply")
print("  4. Divide")

choice = input("Enter choice (1/2/3/4): ")

if choice == "1":
    print(f"Result: {a} + {b} = {calc.add(a, b)}")
elif choice == "2":
    print(f"Result: {a} - {b} = {calc.subtract(a, b)}")
elif choice == "3":
    print(f"Result: {a} * {b} = {calc.multiply(a, b)}")
elif choice == "4":
    print(f"Result: {a} / {b} = {calc.divide(a, b)}")
else:
    print("Invalid choice!")


#Bookshelf class
print("\nTask 4: bookshelf\n")
class Bookshelf:
    def __init__(self):
        self.books = []

    def add_book(self, title):
        self.books.append(title)
        print(f'Added: "{title}"')

    def remove_book(self, title):
        if title in self.books:
            self.books.remove(title)
            print(f'Removed: "{title}"')
        else:
            print(f'Book "{title}" not found')

    def list_books(self):
        if not self.books:
            print("The library is empty.")
        else:
            print("Books in library:")
            for i, book in enumerate(self.books, start=1):
                print(f"{i}. {book}")


library = Bookshelf()
library.add_book("The Pragmatic Programmer")
library.add_book("Clean Code")
library.add_book("Python Crash Course")
library.remove_book("Clean Code")
library.list_books()