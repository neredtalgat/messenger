import React, {useState, useEffect} from "react"

function ToDoList(){
    const [tasks, setTasks] = useState(() => {
        const saved = localStorage.getItem('myTasks');
        return saved ? JSON.parse(saved) : [];
    });

    const [newTask, setNewTask] = useState("");

    function handleInputChange(event){
        setNewTask(event.target.value);
    }

    function addTask(index){
        if(newTask.trim() !== ""){
        setTasks(t => [...t, newTask]);
        setNewTask("");
        } else return;
    }

    function deleteTask(index){
        const updatedTasks = tasks.filter((element, i) => i !== index);
        setTasks(updatedTasks);
    }

    useEffect(() => {
    localStorage.setItem('myTasks', JSON.stringify(tasks));
    }, [tasks]);



    return (
    <div className="container">
        <div className="to-do-list">
            <h1>To-Do List</h1>
            <input 
                type="text"
                placeholder="Add Task..."
                value={newTask}
                onChange={handleInputChange}

            />

            <button 
                className="add-btn"
                onClick={addTask}
            >
                Add
            </button>

            <ul> {tasks.map((task,index) =>
                    <li key={index}>
                        <span type = "text">
                            {task}
                        </span>
                        <button 
                            className="delete-btn"
                            onClick={() => deleteTask(index)}>
                            Delete
                        </button>

                    </li>
            )}

            </ul>
        </div>

    </div>

    )
}


export default ToDoList