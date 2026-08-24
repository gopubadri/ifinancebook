import { useState } from 'react'

export default function PasswordInput({ value, onChange, required, minLength, autoComplete }) {
  const [show, setShow] = useState(false)

  return (
    <div className="password-field">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
      />
      <button type="button" className="password-toggle" onClick={() => setShow(!show)}>
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
