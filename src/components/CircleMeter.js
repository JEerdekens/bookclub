
  const CircleMeter = ({ value, label, className })  => {
  const radius = 40;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className={`circle-meter ${className}`}>
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#d8d2c7"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#b38349"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="circle-label">
        <div className="circle-value">{Math.round(value)}%</div>
        <div className="circle-text">{label}</div>
      </div>
    </div>
  );
};

export default CircleMeter;
