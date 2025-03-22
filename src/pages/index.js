import { useState, useEffect } from "react";
import { Trash2, Mic, Volume2, CheckCircle } from "lucide-react";

const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY";

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [weather, setWeather] = useState("");
  const [weatherIcon, setWeatherIcon] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchWeather();
    setTaskTime(getCurrentTime());
    loadTasksFromStorage();
  }, []);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  const loadTasksFromStorage = () => {
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  };

  const fetchWeather = async () => {
    try {
      const response = await fetch("https://api.weatherapi.com/v1/current.json?key=00c7ead7e5a14baaa53225228252103&q=Lagos");
      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
      const data = await response.json();
      setWeather(`${data.current.temp_c}°C, ${data.current.condition.text}`);
      setWeatherIcon(data.current.condition.icon);
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const fetchAISuggestions = async (task, time) => {
    try {
      const response = await fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: `Suggest a Nigerian breakfast and suitable music for a task: ${task} at ${time}` }]
        })
      });
      const data = await response.json();
      return data?.choices?.[0]?.message?.content || "No suggestion available";
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      return "No suggestion available";
    }
  };

  const addTask = async () => {
    if (newTask.trim() === "" || taskTime === "") return;
    const aiSuggestion = await fetchAISuggestions(newTask, taskTime);
    setTasks([...tasks, { text: newTask, time: taskTime, completed: false, suggestion: aiSuggestion, addedAt: new Date().getTime() }]);
    setNewTask("");
    setTaskTime(getCurrentTime());
  };

  const deleteTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const toggleTaskCompletion = (index) => {
    setTasks(tasks.map((task, i) => i === index ? { ...task, completed: !task.completed } : task));
  };

  const getTaskStatusColor = (task) => {
    const now = new Date().getTime();
    const taskTimeMs = new Date().setHours(...task.time.split(":"));
    if (task.completed) return "text-gray-500 line-through";
    if (now > taskTimeMs) return "text-default";
    if (taskTimeMs - now <= 30 * 60 * 1000) return "text-yellow-500";
    if (taskTimeMs <= now) return "text-green-500";
    if (now - task.addedAt <= 5 * 60 * 1000) return "text-red-500";
    return "text-white";
  };

  const startVoiceRecognition = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.start();
    recognition.onresult = (event) => {
      setNewTask(event.results[0][0].transcript);
    };
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-700 p-6">
        <h3 className="text-3xl font-extrabold text-white mb-6 bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text drop-shadow-lg animate-pulse">Taskion - AI Task Scheduler</h3>
      <div className="animate-bounce w-full max-w-lg bg-gray-800 p-6 rounded-2xl shadow-lg border-4 border-blue-500 flex items-center">
        <img src={weatherIcon} alt="Weather Icon" className="w-12 h-10 mr-4" />
        <p className="text-lg font-semibold text-white">Current Weather: {weather}</p>
      </div>
      <div className="animate-pulse w-full max-w-lg bg-gray-800 p-6 rounded-2xl shadow-lg border-4 border-blue-500">
        <div className="flex flex-col gap-4">
          <div className="flex items-center border border-gray-500 rounded-lg p-3">
            <input
              type="text"
              className="w-full bg-transparent text-white focus:outline-none"
              placeholder="Enter a new task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
            />
            <button onClick={startVoiceRecognition} className="ml-2 text-blue-400 hover:text-blue-600 transition">
              <Mic size={20} />
            </button>
          </div>
          <input
            type="time"
            className="w-full p-3 border border-gray-500 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={taskTime}
            onChange={(e) => setTaskTime(e.target.value)}
          />
          <button
            onClick={addTask}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition duration-200"
          >
            Add Task
          </button>
        </div>
      </div>
      <ul className="mt-6 w-full max-w-lg">
        {tasks.map((task, index) => (
          <li key={index} className="flex justify-between items-center p-3 mb-2 rounded-lg shadow bg-gray-800">
            <span className={getTaskStatusColor(task)}>{task.time} - {task.text}</span>
            <span className="text-gray-400 text-sm">{task.suggestion}</span>
            <div className="flex gap-2">
              <button onClick={() => toggleTaskCompletion(index)} className="text-green-400 hover:text-green-600 transition">
                <CheckCircle size={20} />
              </button>
              <button onClick={() => deleteTask(index)} className="text-red-400 hover:text-red-600 transition">
                <Trash2 size={20} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
