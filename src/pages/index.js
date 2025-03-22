import { useState, useEffect } from "react";
import { Trash2, Mic, Volume2, CheckCircle, Music, Coffee, Book, Zap, AlertTriangle, X } from "lucide-react";

// IMPORTANT: Move this to an environment variable in a real app!
// For demo purposes only
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_KEY;

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [weather, setWeather] = useState("");
  const [weatherIcon, setWeatherIcon] = useState("");
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  // New states for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({
    type: "",
    title: "",
    content: "",
    taskInfo: ""
  });
  // New state for recently viewed suggestions
  const [recentlyViewedSuggestions, setRecentlyViewedSuggestions] = useState([]);

  useEffect(() => {
    fetchWeather().then(() => {
      setTaskTime(getCurrentTime());
      loadFromStorage();
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  // Save filter state to localStorage
  useEffect(() => {
    localStorage.setItem("filter", filter);
  }, [filter]);

  // Save recently viewed suggestions to localStorage
  useEffect(() => {
    localStorage.setItem("recentlyViewedSuggestions", JSON.stringify(recentlyViewedSuggestions));
  }, [recentlyViewedSuggestions]);

  const loadFromStorage = () => {
    // Load tasks
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
    
    // Load filter preference
    const savedFilter = localStorage.getItem("filter");
    if (savedFilter) {
      setFilter(savedFilter);
    }
    
    // Load recently viewed suggestions
    const savedRecentlyViewed = localStorage.getItem("recentlyViewedSuggestions");
    if (savedRecentlyViewed) {
      setRecentlyViewedSuggestions(JSON.parse(savedRecentlyViewed));
    }
  };

  const fetchWeather = async () => {
    try {
      const response = await fetch(
        "https://api.weatherapi.com/v1/current.json?key=00c7ead7e5a14baaa53225228252103&q=Lagos"
      );
      if (!response.ok)
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      const data = await response.json();
      setWeather(`${data.current.temp_c}°C, ${data.current.condition.text}`);
      setWeatherIcon(data.current.condition.icon);
    } catch (error) {
      console.error("Error fetching weather data:", error);
      setError("Failed to load weather data");
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const fetchAISuggestions = async (task, time) => {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "You provide concise activity suggestions based on task context and Nigerian culture. Format your response in three clearly labeled sections: 'Entertainment:', 'Productivity Boost:', and 'Wellness:'. Keep each suggestion under 50 characters. Also provide a detailed version of each suggestion in a format like 'DETAILS_Entertainment: [detailed entertainment suggestion]', 'DETAILS_Productivity: [detailed productivity suggestion]', 'DETAILS_Wellness: [detailed wellness suggestion]'. The detailed suggestions should be 2-3 sentences each with more context and explanation."
              },
              {
                role: "user",
                content: `Suggest activities that would complement this task: "${task}" scheduled at ${time}. Focus on entertainment options, productivity boosters, and wellness activities that would enhance the task experience.`,
              },
            ],
            max_tokens: 300
          }),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "API request failed");
      }
      
      const data = await response.json();
      return data?.choices?.[0]?.message?.content || "No suggestion available";
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      return "No suggestion available";
    }
  };

  const parseSuggestion = (suggestion) => {
    const entertainmentMatch = suggestion.match(/Entertainment:(.*?)(?=Productivity Boost:|Wellness:|DETAILS_|$)/is);
    const productivityMatch = suggestion.match(/Productivity Boost:(.*?)(?=Entertainment:|Wellness:|DETAILS_|$)/is);
    const wellnessMatch = suggestion.match(/Wellness:(.*?)(?=Entertainment:|Productivity Boost:|DETAILS_|$)/is);
    
    // Extract detailed suggestions
    const detailsEntertainmentMatch = suggestion.match(/DETAILS_Entertainment:(.*?)(?=DETAILS_Productivity:|DETAILS_Wellness:|$)/is);
    const detailsProductivityMatch = suggestion.match(/DETAILS_Productivity:(.*?)(?=DETAILS_Entertainment:|DETAILS_Wellness:|$)/is);
    const detailsWellnessMatch = suggestion.match(/DETAILS_Wellness:(.*?)(?=DETAILS_Entertainment:|DETAILS_Productivity:|$)/is);
    
    return {
      entertainment: entertainmentMatch ? entertainmentMatch[1].trim() : "No entertainment suggestion",
      productivity: productivityMatch ? productivityMatch[1].trim() : "No productivity suggestion",
      wellness: wellnessMatch ? wellnessMatch[1].trim() : "No wellness suggestion",
      detailsEntertainment: detailsEntertainmentMatch ? detailsEntertainmentMatch[1].trim() : "No detailed entertainment suggestion available",
      detailsProductivity: detailsProductivityMatch ? detailsProductivityMatch[1].trim() : "No detailed productivity suggestion available",
      detailsWellness: detailsWellnessMatch ? detailsWellnessMatch[1].trim() : "No detailed wellness suggestion available"
    };
  };

  const addTask = async () => {
    setError("");
    if (newTask.trim() === "") {
      setError("Please enter a task");
      return;
    }
    if (taskTime === "") {
      setError("Please set a time");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const aiSuggestion = await fetchAISuggestions(newTask, taskTime);
      const parsedSuggestion = parseSuggestion(aiSuggestion);
      
      const taskId = Date.now().toString(); // Create a unique ID for the task
      
      setTasks([
        ...tasks,
        {
          id: taskId,
          text: newTask,
          time: taskTime,
          completed: false,
          rawSuggestion: aiSuggestion,
          entertainment: parsedSuggestion.entertainment,
          productivity: parsedSuggestion.productivity,
          wellness: parsedSuggestion.wellness,
          detailsEntertainment: parsedSuggestion.detailsEntertainment,
          detailsProductivity: parsedSuggestion.detailsProductivity,
          detailsWellness: parsedSuggestion.detailsWellness,
          addedAt: new Date().getTime(),
        },
      ]);
      
      setNewTask("");
      setTaskTime(getCurrentTime());
    } catch (error) {
      setError("Failed to add task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = (index) => {
    // Find the task to delete
    const taskToDelete = tasks[index];
    
    // Remove this task from recently viewed suggestions if present
    const updatedRecentlyViewed = recentlyViewedSuggestions.filter(
      suggestion => suggestion.taskId !== taskToDelete.id
    );
    
    setRecentlyViewedSuggestions(updatedRecentlyViewed);
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const toggleTaskCompletion = (index) => {
    setTasks(
      tasks.map((task, i) =>
        i === index ? { ...task, completed: !task.completed } : task
      )
    );
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

  // Check if a suggestion has been viewed recently
  const isSuggestionViewed = (taskId, type) => {
    return recentlyViewedSuggestions.some(
      suggestion => suggestion.taskId === taskId && suggestion.type === type
    );
  };

  // New function to open modal with suggestion details
  const openSuggestionModal = (taskId, type, content, taskInfo) => {
    let title = "";
    let icon = null;
    
    switch(type) {
      case "entertainment":
        title = "Entertainment Suggestion";
        icon = <Music size={24} className="text-purple-400 mr-2" />;
        break;
      case "productivity":
        title = "Productivity Suggestion";
        icon = <Zap size={24} className="text-yellow-400 mr-2" />;
        break;
      case "wellness":
        title = "Wellness Suggestion";
        icon = <Coffee size={24} className="text-green-400 mr-2" />;
        break;
    }
    
    setModalContent({
      type,
      title,
      icon,
      content,
      taskInfo
    });
    
    // Add this suggestion to recently viewed
    if (!isSuggestionViewed(taskId, type)) {
      setRecentlyViewedSuggestions([
        ...recentlyViewedSuggestions, 
        { 
          taskId, 
          type, 
          viewedAt: new Date().getTime() 
        }
      ]);
    }
    
    setIsModalOpen(true);
  };

  const startVoiceRecognition = () => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setError("Speech recognition not supported in this browser");
      return;
    }
    
    const recognition = new (window.SpeechRecognition ||
      window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.start();
    
    recognition.onresult = (event) => {
      setNewTask(event.results[0][0].transcript);
    };
    
    recognition.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
    };
  };

  const filteredTasks = () => {
    if (filter === "completed") return tasks.filter(task => task.completed);
    if (filter === "active") return tasks.filter(task => !task.completed);
    return tasks;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-700 p-6">
      <h3 className="text-3xl font-extrabold text-white mb-6 bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text drop-shadow-lg animate-pulse">
        Taskion - AI Task Scheduler
      </h3>
      
      {/* Weather Widget */}
      <div className="w-full max-w-lg bg-gray-800 p-6 rounded-2xl shadow-lg border-4 border-blue-500 flex items-center mb-4">
        {weatherIcon ? (
          <img src={weatherIcon} alt="Weather Icon" className="w-12 h-10 mr-4" />
        ) : (
          <div className="w-12 h-10 mr-4 bg-gray-700 rounded animate-pulse"></div>
        )}
        <p className="text-lg font-semibold text-white">
          {weather || "Loading weather..."}
        </p>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="w-full max-w-lg bg-red-900 p-4 mb-4 rounded-lg flex items-center">
          <AlertTriangle size={20} className="text-red-300 mr-2" />
          <p className="text-red-200">{error}</p>
        </div>
      )}
      
      {/* Task Input Form */}
      <div className="w-full max-w-lg bg-gray-800 p-6 rounded-2xl shadow-lg border-4 border-blue-500 mb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center border border-gray-500 rounded-lg p-3">
            <input
              type="text"
              className="w-full bg-transparent text-white focus:outline-none"
              placeholder="Enter a new task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
            />
            <button
              onClick={startVoiceRecognition}
              className="ml-2 text-blue-400 hover:text-blue-600 transition"
              title="Use voice input"
            >
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
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition duration-200 disabled:opacity-70"
          >
            {isLoading ? "Getting Suggestions..." : "Add Task"}
          </button>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="w-full max-w-lg flex mb-2">
        <button 
          onClick={() => setFilter("all")} 
          className={`flex-1 py-2 text-center rounded-l-lg ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
        >
          All
        </button>
        <button 
          onClick={() => setFilter("active")} 
          className={`flex-1 py-2 text-center ${filter === "active" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
        >
          Active
        </button>
        <button 
          onClick={() => setFilter("completed")} 
          className={`flex-1 py-2 text-center rounded-r-lg ${filter === "completed" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
        >
          Completed
        </button>
      </div>
      
      {/* Task List */}
      <ul className="mt-2 w-full max-w-lg">
        {filteredTasks().length === 0 ? (
          <li className="text-center py-8 text-gray-400">
            No tasks found. Add some tasks to get started!
          </li>
        ) : (
          filteredTasks().map((task, index) => (
            <li
              key={index}
              className="mb-3 rounded-lg shadow bg-gray-800 overflow-hidden"
            >
              <div className="flex justify-between items-center p-3 border-b border-gray-700">
                <span className={getTaskStatusColor(task)}>
                  {task.time} - {task.text}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleTaskCompletion(index)}
                    className="text-green-400 hover:text-green-600 transition"
                    title={task.completed ? "Mark as incomplete" : "Mark as complete"}
                  >
                    <CheckCircle size={20} />
                  </button>
                  <button
                    onClick={() => deleteTask(index)}
                    className="text-red-400 hover:text-red-600 transition"
                    title="Delete task"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-3 bg-gray-900 text-sm">
                {task.entertainment && (
                  <div 
                    className={`flex items-start mb-2 cursor-pointer hover:bg-gray-800 p-1 rounded transition-colors ${isSuggestionViewed(task.id, "entertainment") ? "border-l-2 border-purple-400" : ""}`}
                    onClick={() => openSuggestionModal(task.id, "entertainment", task.detailsEntertainment, task.text)}
                  >
                    <Music size={16} className="text-purple-400 mr-2 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-purple-400">Entertainment: </span>
                      <span className="text-gray-300">{task.entertainment}</span>
                    </div>
                  </div>
                )}
                
                {task.productivity && (
                  <div 
                    className={`flex items-start mb-2 cursor-pointer hover:bg-gray-800 p-1 rounded transition-colors ${isSuggestionViewed(task.id, "productivity") ? "border-l-2 border-yellow-400" : ""}`}
                    onClick={() => openSuggestionModal(task.id, "productivity", task.detailsProductivity, task.text)}
                  >
                    <Zap size={16} className="text-yellow-400 mr-2 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-yellow-400">Productivity: </span>
                      <span className="text-gray-300">{task.productivity}</span>
                    </div>
                  </div>
                )}
                
                {task.wellness && (
                  <div 
                    className={`flex items-start cursor-pointer hover:bg-gray-800 p-1 rounded transition-colors ${isSuggestionViewed(task.id, "wellness") ? "border-l-2 border-green-400" : ""}`}
                    onClick={() => openSuggestionModal(task.id, "wellness", task.detailsWellness, task.text)}
                  >
                    <Coffee size={16} className="text-green-400 mr-2 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-green-400">Wellness: </span>
                      <span className="text-gray-300">{task.wellness}</span>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
      
      {/* Recently Viewed Banner - Optional */}
      {recentlyViewedSuggestions.length > 0 && (
        <div className="w-full max-w-lg mt-4 p-4 bg-gray-800 rounded-lg">
          <h4 className="text-sm text-gray-400 mb-2">Recently viewed suggestions</h4>
          <div className="flex flex-wrap gap-2">
            {recentlyViewedSuggestions.slice(-5).map((suggestion, index) => {
              const relatedTask = tasks.find(task => task.id === suggestion.taskId);
              if (!relatedTask) return null;
              
              let badgeColor = "";
              switch(suggestion.type) {
                case "entertainment": badgeColor = "bg-purple-900 text-purple-200"; break;
                case "productivity": badgeColor = "bg-yellow-900 text-yellow-200"; break;
                case "wellness": badgeColor = "bg-green-900 text-green-200"; break;
              }
              
              return (
                <span 
                  key={index}
                  className={`px-3 py-1 text-xs rounded-full ${badgeColor} cursor-pointer`}
                  onClick={() => {
                    openSuggestionModal(
                      suggestion.taskId,
                      suggestion.type,
                      relatedTask[`details${suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}`],
                      relatedTask.text
                    );
                  }}
                >
                  {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
                </span>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Suggestions Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-blue-500 animate-fadeIn">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <div className="flex items-center">
                {modalContent.icon}
                <h3 className="text-xl font-bold text-white">{modalContent.title}</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-300 mb-4">
                <span className="text-blue-400 font-semibold">Task:</span> {modalContent.taskInfo}
              </p>
              <div className="bg-gray-900 p-4 rounded-lg">
                <p className="text-gray-200 leading-relaxed">{modalContent.content}</p>
              </div>
            </div>
            <div className="flex justify-end p-4 border-t border-gray-700">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add a keyframe animation for modal fade-in */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}