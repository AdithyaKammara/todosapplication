# 📝 Dynamic Todos Application

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=for-the-badge)](https://aditodosapp.ccbp.tech)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-purple?style=for-the-badge&logo=bootstrap)](https://getbootstrap.com/)

> Production-ready task manager built with vanilla JavaScript, demonstrating DOM manipulation, Local Storage API, and event-driven architecture.

**[🚀 Live Demo](https://aditodosapp.ccbp.tech)**

---

## ⚡ Key Features

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- 💾 Persistent storage with Local Storage API
- 🔄 Real-time UI updates without page reloads
- 📱 Fully responsive design with Bootstrap 5
- 🎯 Zero external dependencies for core logic

---

## 🛠️ Tech Stack

**Frontend:** HTML5 • CSS3 • Bootstrap 5  
**Logic:** Vanilla JavaScript (ES6+)  
**Storage:** Local Storage API

---

## 🚀 Quick Start

```bash
# Clone and run
git clone https://github.com/AdithyaKammara/todosapplication.git
cd todosapplication
open index.html
```

---

## 💡 Technical Highlights

**DOM Manipulation**
```javascript
// Dynamic element creation and real-time updates
const todoElement = document.createElement('li');
todoContainer.appendChild(todoElement);
```

**Data Persistence**
```javascript
// Client-side storage with Local Storage API
localStorage.setItem('todosList', JSON.stringify(todosArray));
const savedTodos = JSON.parse(localStorage.getItem('todosList')) || [];
```

**Event-Driven Architecture**
```javascript
// Efficient event delegation for dynamic elements
todoContainer.addEventListener('click', handleTodoActions);
```

---

## 📂 Project Structure

```
todosapplication/
├── index.html    # Main structure
├── style.css     # Styles + Bootstrap overrides
└── script.js     # Core application logic
```

---

## 🎯 What I Learned

- JavaScript fundamentals: array methods, object manipulation, ES6+ features
- DOM APIs: element creation, traversal, and event handling
- Web Storage: Local Storage for client-side data persistence
- Responsive design: mobile-first approach with Bootstrap grid

---

## 🔮 Potential Enhancements

- Task categories and filtering
- Drag-and-drop reordering
- Dark mode toggle
- Backend integration with REST API

---

## 👤 Author

**Adithya Kammara**  
[GitHub](https://github.com/AdithyaKammara) • [LinkedIn](https://linkedin.com/in/adithyakammara)

---

⭐ **Star this repo if you found it helpful!**
