import React, {useState} from 'react';
import './App.css';

function App(){
  const[current, setCurrent] = useState('0');
  const[previous, setPrevious] = useState(null);
  const[operator, setOperator] = useState(null);
  

  const appendNumber = (number) => {

    if(number === '.' && current.includes('.')) return;

    if(current === '0' && number !== '.'){
      setCurrent(String(number));
    } else {
      setCurrent(current + number);
    }
  };

  const chooseOperation = (op) => {
    setOperator(op);
    setPrevious(current);
    setCurrent('0');
  }

  const compute = () => {
    const prev = parseFloat(previous);
    const curr = parseFloat(current);
    if(isNaN(prev) || isNaN(curr)) return;

    let result;
    switch(operator){
      case'+': result = prev + curr;break;
      case'-': result = prev - curr;break;
      case'*': result = prev * curr;break;
      case'/': result = prev / curr;break;
      default: return;
    }

    setCurrent(String(result));
    setOperator(null);
    setPrevious(null);
  }

  const clear = () => {
    setCurrent('0');
    setOperator(null);
    setPrevious(null);
  }

  return (
    <div className="calculator">
      <div className="display">{current}</div>
      <button onClick={clear} className="span-two">AC</button>
      <button onClick={() => chooseOperation('/')}>÷</button>
      <button onClick={() => chooseOperation('*')}>*</button>
      <button onClick={() => chooseOperation('-')}>-</button>
      <button onClick={() => chooseOperation('+')}>+</button>
      <button onClick={() => appendNumber('9')}>9</button>
      <button onClick={() => appendNumber('8')}>8</button>
      <button onClick={() => appendNumber('7')}>7</button>
      <button onClick={() => appendNumber('6')}>6</button>
      <button onClick={() => appendNumber('5')}>5</button>
      <button onClick={() => appendNumber('4')}>4</button>
      <button onClick={() => appendNumber('3')}>3</button>
      <button onClick={() => appendNumber('2')}>2</button>
      <button onClick={() => appendNumber('1')}>1</button>
      <button onClick={() => appendNumber('.')}>.</button>
      <button onClick={compute} className="span-two">=</button>     
    </div>
  );


}
export default App;