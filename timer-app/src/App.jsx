import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [inputValue, setInputValue] = useState("");
  const [name, setName] = useState("");
  const [seconds, setSeconds] = useState(10);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning || seconds === 0) return;
    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, seconds]);

  useEffect(() => {
    if (seconds === 0) setIsRunning(false);
  }, [seconds]);

  return (
    <div className="container">
      <div className="name-row">
        <label>Введите ваше имя</label>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button onClick={() => setName(inputValue)}>Send</button>
      </div>
      <h1>Timer for 10 sec</h1>
      {name && (
        <h1>{name}, осталось {seconds} секунд</h1>
      )}
      {name && seconds === 0 && (
        <p className="done">{name}, Ты отлично справился!</p>
      )}
      <div className="buttons">
        <button
          onClick={() => setIsRunning(true)}
          disabled={isRunning || seconds === 0}
        >Start</button>
        <button onClick={() => setIsRunning(false)}>Stop</button>
        <button onClick={() => {
          setIsRunning(false);
          setSeconds(10);
        }}>Попробовать ещё раз</button>
      </div>
    </div>
  );
}

export default App;
