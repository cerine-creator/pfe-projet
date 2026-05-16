import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './CustomSelect.css';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function CustomSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Sélectionner...", 
  className = "",
  required = false
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`custom-select-container ${className}`} ref={ref}>
      {/* Hidden input for HTML5 validation if required */}
      {required && (
        <input 
          type="text" 
          required 
          value={value} 
          style={{ opacity: 0, position: 'absolute', height: 0, width: 0, zIndex: -1 }} 
          onChange={() => {}}
        />
      )}
      
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''} ${!value ? 'placeholder' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={16} className={`custom-select-icon ${isOpen ? 'open' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="custom-select-menu">
          {options.map(opt => (
            <div 
              key={opt.value}
              className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
