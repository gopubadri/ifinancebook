import Breadcrumb from '../components/Breadcrumb.jsx'

export default function Support() {
  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Support' }]} />
      <h1 style={{ marginBottom: 16 }}>Chilukuri Software Solutions</h1>
      <div className="panel" style={{ maxWidth: 460 }}>
        <div className="panel-body">
          <div className="bs-row"><span>Founder &amp; MD</span><span>Chandu Chilukuri</span></div>
          <div className="bs-row"><span>Support Number</span><span className="mono">7382179386</span></div>
          <div className="bs-row"><span>Sales Manager</span><span className="mono">8985889196</span></div>
          <div className="bs-row"><span>Phone Pe</span><span className="mono">7382179386 / 9494120779</span></div>
          <div className="bs-row"><span>Google Pay</span><span className="mono">7382179386 / 9494120779</span></div>
          <div className="bs-row"><span>Account No</span><span className="mono">33220261048</span></div>
          <div className="bs-row"><span>Bank</span><span>SBI</span></div>
          <div className="bs-row"><span>Branch</span><span>Elamanchili</span></div>
          <div className="bs-row"><span>IFSC Code</span><span className="mono">SBIN0002713</span></div>
        </div>
      </div>
    </div>
  )
}
