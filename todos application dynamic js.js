let todoItemsContainer = document.getElementById("todoItemsContainer");
let addTodoButton = document.getElementById("addTodoButton");
let saveTodoButton = document.getElementById("saveTodoButton");
let todoUserInput = document.getElementById("todoUserInput");

let todoList = JSON.parse(localStorage.getItem("todos")) || [];
let todosCount = todoList.length;

function onTodoStatusChange(checkboxId, labelId) {
    let checkboxElement = document.getElementById(checkboxId);
    let labelElement = document.getElementById(labelId);
    labelElement.classList.toggle("checked");

    // Update status in local storage
    let todoIndex = todoList.findIndex(todo => todo.uniqueNo === parseInt(checkboxId.replace("checkbox", "")));
    if (todoIndex !== -1) {
        todoList[todoIndex].completed = checkboxElement.checked;
    }
}

function onDeleteTodo(todoId) {
    let todoElement = document.getElementById(todoId);
    todoItemsContainer.removeChild(todoElement);

    // Remove from local storage
    todoList = todoList.filter(todo => todo.uniqueNo !== parseInt(todoId.replace("todo", "")));
}

function createAndAppendTodo(todo) {
    let todoId = "todo" + todo.uniqueNo;
    let checkboxId = "checkbox" + todo.uniqueNo;
    let labelId = "label" + todo.uniqueNo;

    let todoElement = document.createElement("li");
    todoElement.classList.add("todo-item-container");
    todoElement.id = todoId;
    todoItemsContainer.appendChild(todoElement);

    let inputElement = document.createElement("input");
    inputElement.type = "checkbox";
    inputElement.id = checkboxId;
    inputElement.classList.add("checkbox-input");
    inputElement.checked = todo.completed || false;

    inputElement.onclick = function() {
        onTodoStatusChange(checkboxId, labelId);
    };

    let labelElement = document.createElement("label");
    labelElement.setAttribute("for", checkboxId);
    labelElement.id = labelId;
    labelElement.classList.add("checkbox-label");
    labelElement.textContent = todo.text;

    if (todo.completed) {
        labelElement.classList.add("checked");
    }

    let deleteIcon = document.createElement("i");
    deleteIcon.classList.add("far", "fa-trash-alt", "delete-icon");
    deleteIcon.onclick = function() {
        onDeleteTodo(todoId);
    };

    todoElement.appendChild(inputElement);
    todoElement.appendChild(labelElement);
    todoElement.appendChild(deleteIcon);
}

function onAddTodo() {
    let userInputValue = todoUserInput.value.trim();
    if (userInputValue === "") {
        alert("Enter Valid Text");
        return;
    }

    todosCount++;
    let newTodo = {
        text: userInputValue,
        uniqueNo: todosCount,
        completed: false
    };

    todoList.push(newTodo);
    createAndAppendTodo(newTodo);
    todoUserInput.value = "";
}

function saveTodosToLocalStorage() {
    localStorage.setItem("todos", JSON.stringify(todoList));
}

// Load existing todos on page load
for (let todo of todoList) {
    createAndAppendTodo(todo);
}

addTodoButton.onclick = function() {
    onAddTodo();
};

saveTodoButton.onclick = function() {
    saveTodosToLocalStorage();
};