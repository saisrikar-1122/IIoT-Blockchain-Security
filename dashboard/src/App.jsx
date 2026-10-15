
import React, { useEffect, useState } from "react";
import { api, post } from "./api.js";

const tabs = [
  "Overview",
  "Devices",
  "Sensor Operations",
  "Attack Lab",
  "Blockchain Admin",
  "Analytics",
  "Access Control",
  "Encryption",
  "Audit Logs",
];

export default function App() {
  const [tab, setTab] = useState("Overview");
  const [id, setId] = useState("DEV001");
  const [temp, setTemp] = useState("28.5");
  const [humidity, setHumidity] = useState("60");
  const [status, setStatus] = useState({});
  const [txs, setTxs] = useState([]);
  const [message, setMessage] = useState(
    "Connect to the local blockchain to begin."
  );
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const currentStatus = await api("/blockchain/status");
      const transactionData = await api("/blockchain/transactions");

      setStatus(currentStatus);
      setTxs(transactionData.transactions || []);
    } catch (e) {
      setStatus({ connected: false });
    }
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, []);

  async function run(path, body) {
    setBusy(true);

    try {
      const result = await post(path, body);

      setMessage(
        result.message +
          (result.blockchain
            ? ` Block ${result.blockchain.blockNumber}; TX ${result.blockchain.transactionHash}`
            : result.fingerprint
              ? ` Fingerprint: ${result.fingerprint}`
              : "")
      );

      await refresh();
    } catch (e) {
      setMessage("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  const inactive = (name) => (
    <button
      className="btn muted"
      disabled
      title="This feature is a static preview"
    >
      {name} · Preview
    </button>
  );

  function renderSensorData(data) {
    if (!data) {
      return "Not available for this transaction";
    }

    return (
      <>
        <div>Temperature: {data.temperature} °C</div>
        <div>Humidity: {data.humidity}%</div>
      </>
    );
  }

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <b>⬡ IIoT SENTINEL</b>
          <small>BLOCKCHAIN SECURITY</small>
        </div>

        <p className="label">WORKSPACE</p>

        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={tab === item ? "nav active" : "nav"}
          >
            {item}
            <span>
              {["Overview", "Devices", "Sensor Operations"].includes(item)
                ? "●"
                : "◌"}
            </span>
          </button>
        ))}

        <div className="connection">
          <i
            className={
              status.connected && status.contractLoaded
                ? "online"
                : "offline"
            }
          />
          {status.connected && status.contractLoaded
            ? "Local chain connected"
            : "Chain not connected"}
        </div>
      </aside>

      <main>
        <header>
          <div>
            <small>
              INDUSTRIAL INTERNET OF THINGS / BLOCKCHAIN BASED SECURITY
            </small>
            <h1>{tab}</h1>
          </div>
          <span className="tag">ACADEMIC PROTOTYPE</span>
        </header>

        <section className="content">
          <div className="hero">
            <div>
              <small>DECENTRALIZED DEVICE TRUST</small>
              <h2>
                Secure industrial IOT Data
                <br />
                <em></em>
              </h2>
              <p>
                Monitor device data, and track security using blockchain
              </p>
            </div>
            <div className="orb">
              ⬡
              <small>IIoT</small>
            </div>
          </div>

          <div className="metrics">
            <article>
              <small>NETWORK</small>
              <strong>{status.connected ? "ONLINE" : "OFFLINE"}</strong>
            </article>
            <article>
              <small>LATEST BLOCK</small>
              <strong>{status.latestBlock ?? "—"}</strong>
            </article>
            <article>
              <small>SECURE TRANSACTIONS</small>
              <strong>{status.transactionCount ?? txs.length}</strong>
            </article>
            <article>
              <small>CHAIN ID</small>
              <strong>{status.chainId ?? "—"}</strong>
            </article>
          </div>

          <div className="notice">{message}</div>

          {(tab === "Overview" || tab === "Devices") && (
            <div className="grid">
              <article className="panel">
                <h3>Device identity & enrollment</h3>
                <p>
                  Generate a device identity, then register its public-key
                  fingerprint on the blockchain.
                </p>

                <label>
                  Device ID
                  <input
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                  />
                </label>

                <div className="actions">
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() =>
                      run("/devices/identity", { deviceId: id })
                    }
                  >
                    1. Generate identity
                  </button>

                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() =>
                      run("/devices/register", { deviceId: id })
                    }
                  >
                    2. Register device
                  </button>
                </div>
              </article>

              <article className="panel">
                <h3>Device registry</h3>
                <p>
                  Identity generation and administrator registration are
                  enabled.
                </p>
                {inactive("Inspect device")}
                {inactive("Revoke device")}
                {inactive("Change trust score")}
              </article>
            </div>
          )}

          {(tab === "Overview" || tab === "Sensor Operations") && (
            <div className="grid">
              <article className="panel">
                <h3>Sensor data transaction</h3>
                <p>
                  Submit sensor readings and write their payload hash to a
                  real local blockchain transaction.
                </p>

                <label>
                  Device ID
                  <input
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                  />
                </label>

                <div className="two">
                  <label>
                    Temperature °C
                    <input
                      type="number"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                    />
                  </label>

                  <label>
                    Humidity %
                    <input
                      type="number"
                      value={humidity}
                      onChange={(e) => setHumidity(e.target.value)}
                    />
                  </label>
                </div>

                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={() =>
                    run("/data/send", {
                      deviceId: id,
                      temperature: Number(temp),
                      humidity: Number(humidity),
                    })
                  }
                >
                  3. Submit data on-chain
                </button>
              </article>

              <article className="panel">
                <h3>Other sensor operations</h3>
                <p>These interface options are visual previews only.</p>
                {inactive("Decrypt latest payload")}
                {inactive("Verify signature")}
                {inactive("Export sensor report")}
              </article>
            </div>
          )}

          {tab !== "Overview" &&
            tab !== "Devices" &&
            tab !== "Sensor Operations" && (
              <div className="panel">
                <h3>{tab} workspace</h3>
                <p>
                  This section is included to show the intended complete
                  dashboard layout. Its operations are not implemented in
                  this 50% prototype.
                </p>

                <div className="preview-grid">
                  {(tab === "Attack Lab"
                    ? [
                        "Tampered data detection",
                        "Invalid signature",
                        "Unauthorized request",
                        "Malicious behavior",
                      ]
                    : tab === "Blockchain Admin"
                      ? [
                          "Transaction ledger",
                          "Contract status",
                          "Admin controls",
                          "Network settings",
                        ]
                      : [
                          "View overview",
                          "Run analysis",
                          "Export report",
                          "Configure policy",
                        ]
                  ).map((item) => (
                    <div className="preview" key={item}>
                      <b>{item}</b>
                      <p>Static preview — not active</p>
                      {inactive("Unavailable")}
                    </div>
                  ))}
                </div>
              </div>
            )}

          <article className="panel">
            <div className="panel-title">
              <div>
                <h3>On-chain transaction ledger</h3>
                <p>
                  Blockchain transactions with associated sensor readings
                </p>
              </div>

              <button className="btn muted" onClick={refresh}>
                Refresh
              </button>
            </div>

            {txs.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>Sensor Data</th>
                      <th>Payload Hash</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {txs.map((transaction, index) => (
                      <tr
                        key={
                          transaction.transactionHash ??
                          transaction.index ??
                          `${transaction.deviceId}-${transaction.timestamp}-${index}`
                        }
                      >
                        <td>{transaction.deviceId}</td>

                        <td>
                          {renderSensorData(transaction.sensorData)}
                        </td>

                        <td>
                          <code>{transaction.payloadHash}</code>
                        </td>

                        <td>
                          {new Date(
                            Number(transaction.timestamp) * 1000
                          ).toLocaleString()}
                        </td>

                        <td>
                          {transaction.accepted ? "Confirmed" : "Rejected"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>
                No transactions yet. Generate identity, register a device,
                then submit sensor data.
              </p>
            )}
          </article>

          <footer></footer>
        </section>
      </main>
    </div>
  );
}
