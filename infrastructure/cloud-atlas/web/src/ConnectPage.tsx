import { useState } from 'react';
import { connectAws, AwsConnectPayload } from './api';

interface Props {
  onConnected: () => void;
}

export default function ConnectPage({ onConnected }: Props) {
  const [form, setForm] = useState<AwsConnectPayload>({
    access_key_id: '',
    secret_access_key: '',
    session_token: '',
    region: 'eu-central-1',
    tf_state_bucket: '',
    tf_state_key: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await connectAws({
        ...form,
        session_token: form.session_token || undefined,
        tf_state_bucket: form.tf_state_bucket || undefined,
        tf_state_key: form.tf_state_key || undefined,
      });
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="connect-page">
      <div className="connect-card">
        <h1>Cloud Atlas</h1>
        <p className="connect-sub">Google Maps for your AWS infrastructure</p>
        <p className="connect-note">
          Enter read-only AWS credentials. They stay in memory only — never saved to disk or database.
        </p>

        <form onSubmit={handleSubmit} className="connect-form">
          <label>
            Access Key ID
            <input
              type="text"
              value={form.access_key_id}
              onChange={(e) => setForm({ ...form, access_key_id: e.target.value })}
              placeholder="AKIA..."
              required
              autoComplete="off"
            />
          </label>
          <label>
            Secret Access Key
            <input
              type="password"
              value={form.secret_access_key}
              onChange={(e) => setForm({ ...form, secret_access_key: e.target.value })}
              required
              autoComplete="off"
            />
          </label>
          <label>
            Session Token <span className="optional">(optional)</span>
            <input
              type="password"
              value={form.session_token}
              onChange={(e) => setForm({ ...form, session_token: e.target.value })}
              autoComplete="off"
            />
          </label>
          <label>
            Region
            <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
              <option value="eu-central-1">eu-central-1</option>
              <option value="eu-west-1">eu-west-1</option>
              <option value="us-east-1">us-east-1</option>
              <option value="us-west-2">us-west-2</option>
              <option value="af-south-1">af-south-1</option>
            </select>
          </label>
          <details className="tf-optional">
            <summary>Terraform state (optional — for managed vs unmanaged)</summary>
            <label>
              State bucket
              <input
                type="text"
                value={form.tf_state_bucket}
                onChange={(e) => setForm({ ...form, tf_state_bucket: e.target.value })}
                placeholder="my-terraform-state-bucket"
              />
            </label>
            <label>
              State key
              <input
                type="text"
                value={form.tf_state_key}
                onChange={(e) => setForm({ ...form, tf_state_key: e.target.value })}
                placeholder="ecommerce/dev/terraform.tfstate"
              />
            </label>
          </details>

          {error && <p className="connect-error">{error}</p>}

          <button type="submit" className="btn connect-btn" disabled={loading}>
            {loading ? 'Scanning your AWS account...' : 'Connect & Visualize'}
          </button>
        </form>

        <p className="connect-tip">
          Tip: create an IAM user with <code>ReadOnlyAccess</code> policy for safest results.
        </p>
      </div>
    </div>
  );
}
