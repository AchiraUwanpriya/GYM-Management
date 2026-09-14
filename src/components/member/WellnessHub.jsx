import React, { useEffect, useState } from 'react';

function ToolCard({ title, subtitle, children }) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: 'var(--gym-surface2)', border: '1px solid var(--gym-border)' }}>
      <div className="text-sm font-semibold" style={{ color: 'var(--gym-text)' }}>{title}</div>
      <div className="text-xs mt-1 mb-4" style={{ color: 'var(--gym-muted)' }}>{subtitle}</div>
      {children}
    </div>
  );
}

function FieldGroup({ label, children }) {
  return <div><label className="gym-label">{label}</label>{children}</div>;
}

const INTENSITY_META = {
  light: { label: 'Light', met: 4.0, color: 'var(--gym-accent3)' },
  moderate: { label: 'Moderate', met: 6.2, color: 'var(--gym-warning)' },
  intense: { label: 'Intense', met: 8.8, color: 'var(--gym-accent2)' },
};

const classifyBmi = (value) => {
  if (!value) return null;
  if (value < 18.5) return { label: 'Underweight', color: 'var(--gym-accent3)' };
  if (value < 25) return { label: 'Healthy range', color: 'var(--gym-success)' };
  if (value < 30) return { label: 'Overweight', color: 'var(--gym-warning)' };
  return { label: 'Obese range', color: 'var(--gym-accent2)' };
};

export default function WellnessHub({ initialHeight = '', initialWeight = '' }) {
  const [height, setHeight] = useState(initialHeight ? String(initialHeight) : '');
  const [weight, setWeight] = useState(initialWeight ? String(initialWeight) : '');
  const [duration, setDuration] = useState('45');
  const [intensity, setIntensity] = useState('moderate');

  useEffect(() => {
    if (initialHeight && !height) setHeight(String(initialHeight));
  }, [initialHeight, height]);

  useEffect(() => {
    if (initialWeight && !weight) setWeight(String(initialWeight));
  }, [initialWeight, weight]);

  const bmi = height && weight
    ? (parseFloat(weight) / ((parseFloat(height) / 100) ** 2)).toFixed(1)
    : '';
  const bmiMeta = classifyBmi(parseFloat(bmi));

  const minutes = parseFloat(duration) || 0;
  const kilograms = parseFloat(weight) || 0;
  const calories = kilograms && minutes
    ? Math.round(INTENSITY_META[intensity].met * kilograms * (minutes / 60))
    : 0;

  const waterMl = kilograms
    ? Math.round((kilograms * 35) + (minutes * 12))
    : 0;

  return (
    <div className="gym-card">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="gym-card-title mb-0">Wellness Tools</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--gym-muted)' }}>
            Quick BMI, calorie burn, and daily water intake estimates for members.
          </div>
        </div>
        <div className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(71,200,255,.08)', color: 'var(--gym-accent3)' }}>
          Estimates only
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <ToolCard title="BMI" subtitle="Use your height and weight to track your range.">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <FieldGroup label="Height (cm)">
              <input className="gym-input" type="number" placeholder="172" value={height} onChange={(e) => setHeight(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Weight (kg)">
              <input className="gym-input" type="number" placeholder="68" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </FieldGroup>
          </div>
          {bmi ? (
            <div className="p-4 rounded-xl text-center" style={{ background: 'var(--gym-surface)', border: `1px solid ${bmiMeta?.color || 'var(--gym-border)'}33` }}>
              <div className="text-3xl font-bold" style={{ color: bmiMeta?.color || 'var(--gym-text)', fontFamily: "'Space Mono', monospace" }}>{bmi}</div>
              <div className="text-sm font-semibold mt-1" style={{ color: bmiMeta?.color || 'var(--gym-text)' }}>{bmiMeta?.label}</div>
              <div className="text-xs mt-2" style={{ color: 'var(--gym-muted)' }}>Normal target range: 18.5 - 24.9</div>
            </div>
          ) : (
            <div className="text-xs" style={{ color: 'var(--gym-muted)' }}>Add height and weight to calculate BMI.</div>
          )}
        </ToolCard>

        <ToolCard title="Calorie Burn" subtitle="Estimated workout burn based on time and effort.">
          <div className="space-y-3">
            <FieldGroup label="Workout Duration (minutes)">
              <input className="gym-input" type="number" min="0" placeholder="45" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Intensity">
              <select className="gym-input" value={intensity} onChange={(e) => setIntensity(e.target.value)}>
                {Object.entries(INTENSITY_META).map(([value, item]) => (
                  <option key={value} value={value}>{item.label}</option>
                ))}
              </select>
            </FieldGroup>
          </div>
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--gym-surface)' }}>
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--gym-muted)' }}>Estimated Burn</div>
            <div className="text-3xl font-bold" style={{ color: INTENSITY_META[intensity].color, fontFamily: "'Space Mono', monospace" }}>{calories || 0} kcal</div>
            <div className="text-xs mt-2" style={{ color: 'var(--gym-muted)' }}>
              This uses your current body weight and a standard MET value for {INTENSITY_META[intensity].label.toLowerCase()} training.
            </div>
          </div>
        </ToolCard>

        <ToolCard title="Water Intake" subtitle="Simple daily hydration estimate with workout adjustment.">
          <div className="space-y-3">
            <div className="p-3 rounded-xl" style={{ background: 'var(--gym-surface)' }}>
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--gym-muted)' }}>Recommended Minimum</div>
              <div className="text-3xl font-bold" style={{ color: 'var(--gym-accent)', fontFamily: "'Space Mono', monospace" }}>
                {waterMl ? `${(waterMl / 1000).toFixed(1)} L` : '0.0 L'}
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--gym-muted)' }}>
                Formula: 35 ml per kg body weight plus 12 ml per workout minute.
              </div>
            </div>
            <div className="text-xs p-3 rounded-xl" style={{ background: 'rgba(71,255,154,.08)', color: 'var(--gym-muted)', border: '1px solid rgba(71,255,154,.18)' }}>
              Spread water through the day and increase intake when training hard or spending long periods on the gym floor.
            </div>
          </div>
        </ToolCard>
      </div>
    </div>
  );
}

