// web-client/src/App.js

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon issue with Leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Use env var in production, localhost in dev
const API_BASE =
  process.env.REACT_APP_API_BASE || "https://disaster-guardian-api.onrender.com";


function App() {
  // Core data
  const [incidents, setIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [incidentError, setIncidentError] = useState("");

  // New: userId for voting
  const [userId, setUserId] = useState("");
  const [voteLoadingId, setVoteLoadingId] = useState(null);
  const [voteError, setVoteError] = useState("");

  // Form state: create incident
  const [newIncident, setNewIncident] = useState({
    type: "flood",
    severity: "medium",
    lat: "",
    lng: "",
    description: "",
  });

  // Risk checker
  const [riskLat, setRiskLat] = useState("");
  const [riskLng, setRiskLng] = useState("");
  const [riskResult, setRiskResult] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState("");

  // Map view
  const [mapCenter, setMapCenter] = useState([16.5449, 81.5212]); // default: Bhimavaram
  const [mapZoom, setMapZoom] = useState(6);
  const [riskRadius] = useState(5000); // 5km circle for risk highlight

  // Simple admin toggle (for show/hide admin tools)
  const [isAdmin] = useState(true);

  // ----------- INIT: create unique userId for this browser -------------
  useEffect(() => {
    let stored = localStorage.getItem("dgUserId");
    if (!stored) {
      stored =
        "u_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2, 8);
      localStorage.setItem("dgUserId", stored);
    }
    setUserId(stored);
  }, []);

  // ---------------- FETCH INCIDENTS ----------------
  const fetchIncidents = async () => {
    try {
      setLoadingIncidents(true);
      setIncidentError("");
      const res = await axios.get(`${API_BASE}/api/incidents`);
      setIncidents(res.data || []);
    } catch (err) {
      console.error("Error fetching incidents:", err);
      setIncidentError("Failed to load incidents.");
    } finally {
      setLoadingIncidents(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  // ---------------- CREATE INCIDENT ----------------
  const handleCreateIncident = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...newIncident,
        lat: Number(newIncident.lat),
        lng: Number(newIncident.lng),
      };

      await axios.post(`${API_BASE}/api/incidents`, payload);
      setNewIncident({
        type: "flood",
        severity: "medium",
        lat: "",
        lng: "",
        description: "",
      });
      fetchIncidents();
    } catch (err) {
      console.error("Error creating incident:", err);
      alert("Failed to create incident.");
    }
  };

  // ---------------- DELETE INCIDENT (admin) ----------------
  const handleDeleteIncident = async (id) => {
    if (!window.confirm("Delete this incident?")) return;

    try {
      await axios.delete(`${API_BASE}/api/incidents/${id}`);
      fetchIncidents();
    } catch (err) {
      console.error("Error deleting incident:", err);
      alert("Failed to delete incident.");
    }
  };

  // ---------------- NEW: VOTE ON INCIDENT ----------------
  const handleVoteOnIncident = async (incidentId, action) => {
    if (!userId) {
      alert("User ID not ready yet, please wait a second and try again.");
      return;
    }

    if (action !== "confirm" && action !== "flag") {
      return;
    }

    try {
      setVoteError("");
      setVoteLoadingId(incidentId);

      await axios.post(`${API_BASE}/api/incidents/${incidentId}/vote`, {
        userId,
        vote: action,
      });

      // Refresh incidents so UI shows updated status & counts
      await fetchIncidents();
    } catch (err) {
      console.error("Error voting on incident:", err);
      setVoteError("Failed to record your vote.");
    } finally {
      setVoteLoadingId(null);
    }
  };

  // ---------------- RISK CHECK ----------------
  const handleRiskCheck = async (e) => {
    e.preventDefault();
    setRiskResult(null);
    setRiskError("");

    if (!riskLat || !riskLng) {
      setRiskError("Please enter both latitude and longitude.");
      return;
    }

    try {
      setRiskLoading(true);
      const res = await axios.post(`${API_BASE}/api/risk/check`, {
        lat: Number(riskLat),
        lng: Number(riskLng),
      });
      setRiskResult(res.data);
      setMapCenter([Number(riskLat), Number(riskLng)]);
      setMapZoom(10);
    } catch (err) {
      console.error("Risk check error:", err);
      setRiskError("Failed to check risk.");
    } finally {
      setRiskLoading(false);
    }
  };

  const handleUseMyLocationForRisk = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setRiskLat(latitude.toFixed(6));
        setRiskLng(longitude.toFixed(6));
        setMapCenter([latitude, longitude]);
        setMapZoom(11);
      },
      () => {
        alert("Could not get your location.");
      }
    );
  };

  // ---------------- ADMIN SIMULATION HELPERS ----------------
  const handleSeedSimulation = async (type = "flood") => {
    try {
      await axios.post(`${API_BASE}/api/incidents/seed`, { type });
      fetchIncidents();
    } catch (err) {
      console.error("Error seeding simulation:", err);
      alert("Failed to seed simulation incidents.");
    }
  };

  const handleClearSimulations = async () => {
    if (!window.confirm("Clear all simulation incidents?")) return;
    try {
      await axios.delete(`${API_BASE}/api/incidents/clear-simulations`);
      fetchIncidents();
    } catch (err) {
      console.error("Error clearing simulations:", err);
      alert("Failed to clear simulation incidents.");
    }
  };

  // ---------------- UTILS ----------------
  const getVerificationBadgeStyles = (status) => {
    switch (status) {
      case "verified":
        return {
          background: "#dcfce7",
          color: "#166534",
        };
      case "suspicious":
        return {
          background: "#fee2e2",
          color: "#b91c1c",
        };
      default:
        return {
          background: "#e5e7eb",
          color: "#374151",
        };
    }
  };

  // ---------------- RENDER ----------------
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e5e7eb",
        padding: "1.5rem",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          background: "#020617",
          borderRadius: "1rem",
          padding: "1.5rem",
          boxShadow: "0 25px 50px -12px rgba(15,23,42,0.8)",
          border: "1px solid #1e293b",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.8rem",
                fontWeight: 700,
                margin: 0,
                color: "#e5e7eb",
              }}
            >
              Disaster Guardian
            </h1>
            <p
              style={{
                margin: "0.4rem 0 0",
                fontSize: "0.95rem",
                color: "#9ca3af",
              }}
            >
              Real-time disaster reporting, verification, and risk intelligence
              dashboard.
            </p>
          </div>
          <div
            style={{
              textAlign: "right",
              fontSize: "0.8rem",
              color: "#6b7280",
            }}
          >
            <div>User ID: {userId || "…"}</div>
            <div>API: {API_BASE}</div>
          </div>
        </header>

        {/* Top layout: Map + Risk checker */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Map */}
          <section
            style={{
              borderRadius: "0.75rem",
              overflow: "hidden",
              border: "1px solid #1f2937",
              background: "#020617",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1rem",
                borderBottom: "1px solid #1f2937",
                fontSize: "0.9rem",
                color: "#e5e7eb",
              }}
            >
              Live Incident Map
            </div>
            <div style={{ height: "320px" }}>
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ width: "100%", height: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {riskLat && riskLng && (
                  <Circle
                    center={[
                      Number(riskLat) || mapCenter[0],
                      Number(riskLng) || mapCenter[1],
                    ]}
                    radius={riskRadius}
                    pathOptions={{ color: "#38bdf8", fillOpacity: 0.15 }}
                  />
                )}
                {incidents.map((inc) => (
                  <Marker key={inc._id} position={[inc.lat, inc.lng]}>
                    <Popup>
                      <div style={{ fontSize: "0.8rem" }}>
                        <div>
                          <strong>{inc.type.toUpperCase()}</strong> (
                          {inc.severity})
                        </div>
                        <div>{inc.description}</div>
                        <div>
                          Status:{" "}
                          <strong>
                            {inc.verificationStatus
                              ? inc.verificationStatus.toUpperCase()
                              : "UNVERIFIED"}
                          </strong>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </section>

          {/* Risk checker */}
          <section
            style={{
              borderRadius: "0.75rem",
              border: "1px solid #1f2937",
              background: "#020617",
              padding: "0.75rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                margin: 0,
                color: "#e5e7eb",
              }}
            >
              Check Risk at Location
            </h2>

            <form onSubmit={handleRiskCheck} style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem" }}>
                Latitude
                <input
                  type="number"
                  step="0.000001"
                  value={riskLat}
                  onChange={(e) => setRiskLat(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: "0.2rem",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.85rem",
                  }}
                />
              </label>
              <label style={{ fontSize: "0.85rem" }}>
                Longitude
                <input
                  type="number"
                  step="0.000001"
                  value={riskLng}
                  onChange={(e) => setRiskLng(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: "0.2rem",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.85rem",
                  }}
                />
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginTop: "0.25rem",
                }}
              >
                <button
                  type="submit"
                  disabled={riskLoading}
                  style={{
                    flex: 1,
                    padding: "0.45rem 0.6rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background:
                      "linear-gradient(to right, #22c55e, #16a34a)",
                    color: "#0b1120",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  {riskLoading ? "Checking..." : "Check Risk"}
                </button>
                <button
                  type="button"
                  onClick={handleUseMyLocationForRisk}
                  style={{
                    flex: 1,
                    padding: "0.45rem 0.6rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #334155",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Use My Location
                </button>
              </div>
            </form>

            {riskError && (
              <div
                style={{
                  marginTop: "0.25rem",
                  fontSize: "0.8rem",
                  color: "#f87171",
                }}
              >
                {riskError}
              </div>
            )}

            {riskResult && (
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.85rem",
                  padding: "0.5rem 0.6rem",
                  borderRadius: "0.5rem",
                  background: "#020617",
                  border: "1px solid #1f2937",
                  color: "#e5e7eb",
                }}
              >
                <div>
                  <strong>Risk Level:</strong> {riskResult.riskLevel}
                </div>
                <div>
                  <strong>Nearby Incidents:</strong>{" "}
                  {riskResult.nearbyCount ?? "N/A"}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Bottom layout: Operations + Incidents + Admin */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1.5fr 1fr",
            gap: "1rem",
          }}
        >
          {/* Create incident */}
          <section
            style={{
              borderRadius: "0.75rem",
              border: "1px solid #1f2937",
              background: "#020617",
              padding: "0.75rem 1rem",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                margin: 0,
                marginBottom: "0.5rem",
                color: "#e5e7eb",
              }}
            >
              Report Incident
            </h2>
            <form
              onSubmit={handleCreateIncident}
              style={{ display: "grid", gap: "0.5rem" }}
            >
              <label style={{ fontSize: "0.85rem" }}>
                Type
                <select
                  value={newIncident.type}
                  onChange={(e) =>
                    setNewIncident((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    marginTop: "0.2rem",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="flood">Flood</option>
                  <option value="fire">Fire</option>
                  <option value="earthquake">Earthquake</option>
                  <option value="accident">Accident</option>
                  <option value="landslide">Landslide</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label style={{ fontSize: "0.85rem" }}>
                Severity
                <select
                  value={newIncident.severity}
                  onChange={(e) =>
                    setNewIncident((prev) => ({
                      ...prev,
                      severity: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    marginTop: "0.2rem",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label style={{ fontSize: "0.85rem" }}>
                Latitude
                <input
                  type="number"
                  step="0.000001"
                  value={newIncident.lat}
                  onChange={(e) =>
                    setNewIncident((prev) => ({
                      ...prev,
                      lat: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    marginTop: "0.2rem",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.85rem",
                  }}
                />
              </label>

              <label style={{ fontSize: "0.85rem" }}>
                Longitude
                <input
                  type="number"
                  step="0.000001"
                  value={newIncident.lng}
                  onChange={(e) =>
                    setNewIncident((prev) => ({
                      ...prev,
                      lng: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    marginTop: "0.2rem",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.85rem",
                  }}
                />
              </label>

              <label style={{ fontSize: "0.85rem" }}>
                Description
                <textarea
                  rows={3}
                  value={newIncident.description}
                  onChange={(e) =>
                    setNewIncident((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    marginTop: "0.2rem",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #374151",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: "0.85rem",
                    resize: "vertical",
                  }}
                />
              </label>

              <button
                type="submit"
                style={{
                  marginTop: "0.35rem",
                  padding: "0.45rem 0.6rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background:
                    "linear-gradient(to right, #3b82f6, #0ea5e9)",
                  color: "#0b1120",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Submit Incident
              </button>
            </form>
          </section>

          {/* All incidents list with verification & voting */}
          <section
            style={{
              borderRadius: "0.75rem",
              border: "1px solid #1f2937",
              background: "#020617",
              padding: "0.75rem 1rem",
              overflowY: "auto",
              maxHeight: "360px",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                margin: 0,
                marginBottom: "0.5rem",
                color: "#e5e7eb",
              }}
            >
              All Incidents
            </h2>

            {loadingIncidents && (
              <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                Loading incidents…
              </div>
            )}
            {incidentError && (
              <div style={{ fontSize: "0.85rem", color: "#f97373" }}>
                {incidentError}
              </div>
            )}
            {voteError && (
              <div style={{ fontSize: "0.85rem", color: "#f97373" }}>
                {voteError}
              </div>
            )}

            {!loadingIncidents && incidents.length === 0 && (
              <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                No incidents reported yet.
              </div>
            )}

            <div style={{ display: "grid", gap: "0.5rem" }}>
              {incidents.map((inc) => {
                const status = inc.verificationStatus || "unverified";
                const badgeStyles = getVerificationBadgeStyles(status);
                const confirmVoters = inc.confirmVoters || [];
                const flagVoters = inc.flagVoters || [];
                const hasVoted =
                  (userId && confirmVoters.includes(userId)) ||
                  (userId && flagVoters.includes(userId));

                return (
                  <div
                    key={inc._id}
                    style={{
                      borderRadius: "0.5rem",
                      border: "1px solid #1f2937",
                      padding: "0.5rem 0.6rem",
                      background: "#020617",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                      }}
                    >
                      <div>
                        <div>
                          <strong>{inc.type.toUpperCase()}</strong> (
                          {inc.severity})
                        </div>
                        <div style={{ color: "#9ca3af" }}>
                          {inc.description || "No description"}
                        </div>
                        <div style={{ color: "#6b7280", fontSize: "0.8rem" }}>
                          {inc.lat.toFixed(4)}, {inc.lng.toFixed(4)} •{" "}
                          {new Date(inc.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "0.25rem",
                        }}
                      >
                        <span
                          style={{
                            ...badgeStyles,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "999px",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                          }}
                        >
                          {status.toUpperCase()}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "#9ca3af",
                          }}
                        >
                          ✅ {inc.confirmations || 0} | 🚩 {inc.flags || 0}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.35rem",
                        marginTop: "0.3rem",
                      }}
                    >
                      <button
                        type="button"
                        disabled={hasVoted || voteLoadingId === inc._id}
                        onClick={() =>
                          handleVoteOnIncident(inc._id, "confirm")
                        }
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "999px",
                          border: "none",
                          background: hasVoted
                            ? "#111827"
                            : "linear-gradient(to right, #22c55e, #16a34a)",
                          color: hasVoted ? "#6b7280" : "#0b1120",
                          fontSize: "0.75rem",
                          cursor: hasVoted ? "default" : "pointer",
                        }}
                      >
                        {hasVoted
                          ? "Already voted"
                          : voteLoadingId === inc._id
                          ? "Submitting..."
                          : "Confirm"}
                      </button>

                      <button
                        type="button"
                        disabled={hasVoted || voteLoadingId === inc._id}
                        onClick={() =>
                          handleVoteOnIncident(inc._id, "flag")
                        }
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "999px",
                          border: "1px solid #b91c1c",
                          background: hasVoted ? "#111827" : "#020617",
                          color: "#fca5a5",
                          fontSize: "0.75rem",
                          cursor: hasVoted ? "default" : "pointer",
                        }}
                      >
                        {hasVoted
                          ? "Already voted"
                          : voteLoadingId === inc._id
                          ? "Submitting..."
                          : "Mark fake"}
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteIncident(inc._id)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "999px",
                            border: "1px solid #ef4444",
                            background: "#020617",
                            color: "#fecaca",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            marginLeft: "auto",
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Admin simulation panel */}
          <section
            style={{
              borderRadius: "0.75rem",
              border: "1px solid #1f2937",
              background: "#020617",
              padding: "0.75rem 1rem",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                margin: 0,
                marginBottom: "0.5rem",
                color: "#e5e7eb",
              }}
            >
              Admin Controls
            </h2>
            <p
              style={{
                fontSize: "0.8rem",
                color: "#9ca3af",
                marginTop: 0,
                marginBottom: "0.5rem",
              }}
            >
              Seed synthetic incidents to simulate large-scale disasters for
              demos and testing.
            </p>

            <div
              style={{
                display: "grid",
                gap: "0.5rem",
                fontSize: "0.85rem",
              }}
            >
              <button
                type="button"
                onClick={() => handleSeedSimulation("flood")}
                style={{
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background:
                    "linear-gradient(to right, #22c55e, #4ade80)",
                  color: "#0b1120",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Simulate Flood Cluster
              </button>

              <button
                type="button"
                onClick={() => handleSeedSimulation("earthquake")}
                style={{
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background:
                    "linear-gradient(to right, #f97316, #ea580c)",
                  color: "#0b1120",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Simulate Earthquake Wave
              </button>

              <button
                type="button"
                onClick={handleClearSimulations}
                style={{
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #f97373",
                  background: "#020617",
                  color: "#fecaca",
                  fontWeight: 500,
                  cursor: "pointer",
                  marginTop: "0.25rem",
                }}
              >
                Clear Simulation Incidents
              </button>

              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                }}
              >
                <strong>Total incidents:</strong> {incidents.length}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
