import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Polyline,
  Circle,
} from 'react-leaflet';
import L from 'leaflet';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import './App.css';

// Fix default marker icons for Leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons for severity levels
const severityIcons = {
  high: L.icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  medium: L.icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
    shadowUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  low: L.icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
};

// Icon for user's own location
const userIcon = L.icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const API_BASE =
  process.env.REACT_APP_API_BASE || 'http://localhost:5000';


// Small helper component to handle map clicks
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Haversine distance in km
const toRad = (deg) => (deg * Math.PI) / 180;
const distanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// demo admin password
const ADMIN_PASSWORD = 'guardian123';

function App() {
  const [incidents, setIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [error, setError] = useState('');

  // Filters: type, severity, time range, maxCount
  const [filters, setFilters] = useState({
    type: 'all',
    severity: 'all',
    timeRange: 'all',
    maxCount: 'all',
  });

  const [formData, setFormData] = useState({
    type: 'flood',
    severity: 'medium',
    description: '',
    lat: '',
    lng: '',
  });

  const [routeForm, setRouteForm] = useState({
    startLat: '',
    startLng: '',
    endLat: '',
    endLng: '',
  });

  const [routeResult, setRouteResult] = useState(null);
  const [routeError, setRouteError] = useState('');

  const [showDensity, setShowDensity] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  const [userLocation, setUserLocation] = useState(null);
  const [userRiskText, setUserRiskText] = useState('');
  const [locating, setLocating] = useState(false);

  const [sosLoading, setSosLoading] = useState(false);

  const [mapCenter, setMapCenter] = useState([16.5449, 81.5212]);
  const [mapZoom, setMapZoom] = useState(13);

  const [mapClickMode, setMapClickMode] = useState('incident');

  const [timePlaybackEnabled, setTimePlaybackEnabled] = useState(false);
  const [playbackSlider, setPlaybackSlider] = useState(100);

  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [language, setLanguage] = useState('en');

  const [proximityStats, setProximityStats] = useState(null);

  // simple page navigation
  const [activePage, setActivePage] = useState('dashboard'); // 'dashboard' | 'operations' | 'admin' | 'help'

  // Fetch incidents when timeRange or maxCount changes
  useEffect(() => {
    fetchIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.timeRange, filters.maxCount]);

  const fetchIncidents = async () => {
    setLoadingIncidents(true);
    setError('');
    try {
      let url = `${API_BASE}/api/incidents?`;

      if (filters.timeRange !== 'all') {
        url += `hours=${filters.timeRange}&`;
      }
      if (filters.maxCount !== 'all') {
        url += `limit=${filters.maxCount}&`;
      }

      const res = await axios.get(url);
      setIncidents(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load incidents.');
    } finally {
      setLoadingIncidents(false);
    }
  };

  // Apply type + severity filters on frontend
  const filteredIncidents = incidents.filter((inc) => {
    if (filters.type !== 'all' && inc.type !== filters.type) return false;
    if (filters.severity !== 'all' && inc.severity !== filters.severity)
      return false;
    return true;
  });

  // TIME PLAYBACK
  let earliestTs = null;
  let latestTs = null;
  if (filteredIncidents.length > 0) {
    const sortedByTime = [...filteredIncidents].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    earliestTs = new Date(sortedByTime[0].createdAt).getTime();
    latestTs = new Date(
      sortedByTime[sortedByTime.length - 1].createdAt
    ).getTime();
  }

  let cutoffTs = null;
  if (
    timePlaybackEnabled &&
    earliestTs !== null &&
    latestTs !== null &&
    playbackSlider >= 0 &&
    playbackSlider <= 100
  ) {
    const span = latestTs - earliestTs;
    cutoffTs = earliestTs + (span * playbackSlider) / 100;
  }

  // final visible incidents on UI
  let displayIncidents = filteredIncidents;
  if (timePlaybackEnabled && cutoffTs !== null) {
    displayIncidents = filteredIncidents.filter((inc) => {
      const t = new Date(inc.createdAt).getTime();
      return t <= cutoffTs;
    });
  }

  // STATS
  const totalIncidents = incidents.length;
  const visibleIncidents = displayIncidents.length;
  const highSeverityIncidents = displayIncidents.filter(
    (inc) => inc.severity === 'high'
  ).length;

  let overallRisk = 'No data';
  if (visibleIncidents > 0) {
    if (highSeverityIncidents >= 5) {
      overallRisk = 'Critical';
    } else if (highSeverityIncidents >= 2) {
      overallRisk = 'Elevated';
    } else {
      overallRisk = 'Normal';
    }
  }

  // overview card color
  const overviewBg =
    overallRisk === 'Critical'
      ? '#fee2e2'
      : overallRisk === 'Elevated'
      ? '#fffbeb'
      : '#ecfdf3';

  // CHART DATA
  const typeCountsMap = {};
  displayIncidents.forEach((inc) => {
    typeCountsMap[inc.type] = (typeCountsMap[inc.type] || 0) + 1;
  });
  const typeChartData = Object.entries(typeCountsMap).map(
    ([type, count]) => ({
      type: type.toUpperCase(),
      count,
    })
  );

  const severityCountsMap = {};
  displayIncidents.forEach((inc) => {
    severityCountsMap[inc.severity] =
      (severityCountsMap[inc.severity] || 0) + 1;
  });
  const severityChartData = Object.entries(severityCountsMap).map(
    ([severity, count]) => ({
      severity: severity.toUpperCase(),
      count,
    })
  );

  // CREATE INCIDENT
  const handleCreateIncident = async (e) => {
    e.preventDefault();
    setError('');

    const { type, severity, description, lat, lng } = formData;

    if (!type || lat === '' || lng === '') {
      setError('Type, latitude and longitude are required.');
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/incidents`, {
        type,
        severity,
        description,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      });

      setFormData({
        type: 'flood',
        severity: 'medium',
        description: '',
        lat: '',
        lng: '',
      });

      fetchIncidents();
    } catch (err) {
      console.error(err);
      setError('Failed to create incident.');
    }
  };

  // DELETE INCIDENT
  const handleDeleteIncident = async (id) => {
    if (!isAdmin) {
      alert('Only admin can delete incidents.');
      return;
    }

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this incident?'
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_BASE}/api/incidents/${id}`);
      fetchIncidents();
    } catch (err) {
      console.error(err);
      alert('Failed to delete incident.');
    }
  };

  // ROUTE SAFETY
  const handleRouteCheck = async (e) => {
    e.preventDefault();
    setRouteError('');
    setRouteResult(null);

    const { startLat, startLng, endLat, endLng } = routeForm;

    if (
      startLat === '' ||
      startLng === '' ||
      endLat === '' ||
      endLng === ''
    ) {
      setRouteError('Start and end coordinates are required.');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/api/route/safety`, {
        start: {
          lat: parseFloat(startLat),
          lng: parseFloat(startLng),
        },
        end: {
          lat: parseFloat(endLat),
          lng: parseFloat(endLng),
        },
      });

      setRouteResult(res.data);
    } catch (err) {
      console.error(err);
      setRouteError('Failed to check route safety.');
    }
  };

  // MAP CLICK BEHAVIOUR
  const handleMapClick = (latlng) => {
    const { lat, lng } = latlng;

    if (mapClickMode === 'incident') {
      setFormData((prev) => ({
        ...prev,
        lat: lat.toFixed(5),
        lng: lng.toFixed(5),
      }));
    } else if (mapClickMode === 'routeStart') {
      setRouteForm((prev) => ({
        ...prev,
        startLat: lat.toFixed(5),
        startLng: lng.toFixed(5),
      }));
    } else if (mapClickMode === 'routeEnd') {
      setRouteForm((prev) => ({
        ...prev,
        endLat: lat.toFixed(5),
        endLng: lng.toFixed(5),
      }));
    }
  };

  const hasRouteCoords =
    routeForm.startLat &&
    routeForm.startLng &&
    routeForm.endLat &&
    routeForm.endLng;

  const routeLinePositions = hasRouteCoords
    ? [
        [parseFloat(routeForm.startLat), parseFloat(routeForm.startLng)],
        [parseFloat(routeForm.endLat), parseFloat(routeForm.endLng)],
      ]
    : [];

  const getRadiusForSeverity = (severity) => {
    if (severity === 'high') return 500;
    if (severity === 'medium') return 300;
    return 150;
  };

  const getColorForSeverity = (severity) => {
    if (severity === 'high') return 'red';
    if (severity === 'medium') return 'orange';
    return 'green';
  };

  // ADMIN
  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setAdminError('');
    } else {
      setIsAdmin(false);
      setAdminError('Incorrect password');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminPassword('');
    setAdminError('');
  };

  // LOCATE ME + PROXIMITY
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        setMapZoom(14);

        if (displayIncidents.length === 0) {
          setUserRiskText(
            'No incidents currently visible near you (based on filters and timeline).'
          );
          setProximityStats(null);
          return;
        }

        let minDist = Infinity;
        let nearest = null;
        displayIncidents.forEach((inc) => {
          const d = distanceKm(latitude, longitude, inc.lat, inc.lng);
          if (d < minDist) {
            minDist = d;
            nearest = inc;
          }
        });

        if (!nearest) {
          setUserRiskText(
            'No incidents currently visible near you (based on filters and timeline).'
          );
          setProximityStats(null);
          return;
        }

        const roundedDist = minDist.toFixed(2);
        setUserRiskText(
          `Nearest incident is a ${nearest.severity.toUpperCase()} ${nearest.type.toUpperCase()} about ${roundedDist} km away.`
        );

        const buckets = [
          { label: '1 km', radiusKm: 1 },
          { label: '3 km', radiusKm: 3 },
          { label: '5 km', radiusKm: 5 },
        ];

        const stats = buckets.map((b) => {
          const within = displayIncidents.filter((inc) => {
            const d = distanceKm(latitude, longitude, inc.lat, inc.lng);
            return d <= b.radiusKm;
          });
          const highCount = within.filter(
            (inc) => inc.severity === 'high'
          ).length;
          return {
            label: b.label,
            radiusKm: b.radiusKm,
            total: within.length,
            high: highCount,
          };
        });

        setProximityStats(stats);
      },
      (err) => {
        console.error(err);
        setLocating(false);
        alert('Unable to get your location.');
      }
    );
  };

  // QUICK SOS
  const handleQuickSOS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }
    setSosLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          await axios.post(`${API_BASE}/api/incidents`, {
            type: 'accident',
            severity: 'high',
            description: 'Quick SOS from user location',
            lat: latitude,
            lng: longitude,
          });
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
          setMapZoom(15);
          fetchIncidents();
          alert('SOS reported successfully.');
        } catch (err) {
          console.error(err);
          alert('Failed to send SOS.');
        } finally {
          setSosLoading(false);
        }
      },
      (err) => {
        console.error(err);
        setSosLoading(false);
        alert('Unable to get your location for SOS.');
      }
    );
  };

  // VOICE INPUT
  const handleStartVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsRecording(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setFormData((prev) => ({
        ...prev,
        description: transcript,
      }));
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      alert('Error during voice recognition.');
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  // DEMO SCENARIOS
  const randInRange = (min, max) => Math.random() * (max - min) + min;

  const handleScenario = async (scenario) => {
    if (!isAdmin) {
      alert('Only admin can run simulations.');
      return;
    }

    setScenarioLoading(true);
    setError('');
    try {
      let centerLat = 16.5449;
      let centerLng = 81.5212;
      let incidentsToCreate = [];

      if (scenario === 'bhimavaramFlood') {
        centerLat = 16.5449;
        centerLng = 81.5212;
        const count = 20;
        for (let i = 0; i < count; i++) {
          const offsetLat = randInRange(-0.02, 0.02);
          const offsetLng = randInRange(-0.02, 0.02);
          const severityRand = Math.random();
          let severity = 'medium';
          if (severityRand > 0.7) severity = 'high';
          else if (severityRand < 0.3) severity = 'low';

          incidentsToCreate.push({
            type: 'flood',
            severity,
            description: 'Simulated flood hotspot in Bhimavaram',
            lat: centerLat + offsetLat,
            lng: centerLng + offsetLng,
          });
        }
      } else if (scenario === 'cityStorm') {
        centerLat = 17.385;
        centerLng = 78.4867;
        const count = 25;
        const types = ['storm', 'flood', 'accident'];
        for (let i = 0; i < count; i++) {
          const offsetLat = randInRange(-0.05, 0.05);
          const offsetLng = randInRange(-0.05, 0.05);
          const severityRand = Math.random();
          let severity = 'medium';
          if (severityRand > 0.75) severity = 'high';
          else if (severityRand < 0.25) severity = 'low';

          const type = types[Math.floor(Math.random() * types.length)];

          incidentsToCreate.push({
            type,
            severity,
            description: 'Simulated city-wide storm impact',
            lat: centerLat + offsetLat,
            lng: centerLng + offsetLng,
          });
        }
      }

      await Promise.all(
        incidentsToCreate.map((inc) =>
          axios.post(`${API_BASE}/api/incidents`, inc)
        )
      );

      setMapCenter([centerLat, centerLng]);
      setMapZoom(13);
      fetchIncidents();
    } catch (err) {
      console.error(err);
      setError('Failed to generate demo scenario.');
    } finally {
      setScenarioLoading(false);
    }
  };

  // CLEAR DEMO
  const handleClearDemoData = async () => {
    if (!isAdmin) {
      alert('Enable Admin Mode to clear demo data.');
      return;
    }
    setScenarioLoading(true);
    setError('');
    try {
      const demoIncidents = incidents.filter(
        (inc) =>
          inc.description &&
          inc.description.startsWith('Simulated ')
      );

      if (demoIncidents.length === 0) {
        alert('No simulated demo incidents found to clear.');
        setScenarioLoading(false);
        return;
      }

      const confirmClear = window.confirm(
        `This will delete ${demoIncidents.length} simulated incidents. Continue?`
      );
      if (!confirmClear) {
        setScenarioLoading(false);
        return;
      }

      await Promise.all(
        demoIncidents.map((inc) =>
          axios.delete(`${API_BASE}/api/incidents/${inc._id}`)
        )
      );

      fetchIncidents();
    } catch (err) {
      console.error(err);
      setError('Failed to clear demo data.');
    } finally {
      setScenarioLoading(false);
    }
  };

  // EXPORT CSV
  const handleExportCSV = () => {
    if (displayIncidents.length === 0) {
      alert('No incidents to export for current filters / timeline.');
      return;
    }

    const headers = [
      'type',
      'severity',
      'description',
      'lat',
      'lng',
      'createdAt',
    ];

    const rows = displayIncidents.map((inc) => [
      inc.type,
      inc.severity,
      (inc.description || '').replace(/[\n\r,]+/g, ' '),
      inc.lat,
      inc.lng,
      new Date(inc.createdAt).toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'disaster_guardian_incidents.csv';
    a.click();

    URL.revokeObjectURL(url);
  };

  // language helper
  const t = (en, te) => (language === 'en' ? en : te);

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-left">
          <h1>{t('Disaster Guardian', 'Disaster Guardian')}</h1>
          <p className="app-subtitle">
            {t(
              'Smart incident & crowd safety console',
              'స్మార్ట్ సంఘటన & క్రౌడ్ భద్రతా కన్సోల్'
            )}
          </p>
        </div>
        <div className="header-right">
          <span className="env-pill">
            {t('Web Dashboard', 'వెబ్ డ్యాష్‌బోర్డ్')}
          </span>
          <div className="lang-toggle">
            <span>{t('Language:', 'భాష:')}</span>
            <button
              onClick={() => setLanguage('en')}
              className={language === 'en' ? 'lang-btn active' : 'lang-btn'}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('te')}
              className={language === 'te' ? 'lang-btn active' : 'lang-btn'}
            >
              TE
            </button>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={
            activePage === 'dashboard' ? 'nav-btn active' : 'nav-btn'
          }
          onClick={() => setActivePage('dashboard')}
        >
          {t('Dashboard', 'డ్యాష్‌బోర్డ్')}
        </button>
        <button
          className={
            activePage === 'operations' ? 'nav-btn active' : 'nav-btn'
          }
          onClick={() => setActivePage('operations')}
        >
          {t('Live Operations', 'లైవ్ ఆపరేషన్‌లు')}
        </button>
        <button
          className={
            activePage === 'admin' ? 'nav-btn active' : 'nav-btn'
          }
          onClick={() => setActivePage('admin')}
        >
          {t('Admin & Simulations', 'అడ్మిన్ & సిమ్యులేషన్స్')}
        </button>
        <button
          className={
            activePage === 'help' ? 'nav-btn active' : 'nav-btn'
          }
          onClick={() => setActivePage('help')}
        >
          {t('Help / About', 'హెల్ప్ / గురించి')}
        </button>
      </nav>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <main className="app-main">
        {/* DASHBOARD PAGE */}
        {activePage === 'dashboard' && (
          <div className="page-grid">
            <div className="column">
              <section
                className="card card-overview"
                style={{ backgroundColor: overviewBg }}
              >
                <h2>{t('Overview', 'సారాంశం')}</h2>
                <p>
                  <strong>
                    {t(
                      'Total incidents (time/max filter):',
                      'మొత్తం సంఘటనలు (ఫిల్టర్ల తర్వాత):'
                    )}
                  </strong>{' '}
                  {totalIncidents}
                </p>
                <p>
                  <strong>
                    {t(
                      'Visible after all filters & timeline:',
                      'అన్ని ఫిల్టర్ల & టైమ్‌లైన్ తర్వాత కనిపించే సంఘటనలు:'
                    )}
                  </strong>{' '}
                  {visibleIncidents}
                </p>
                <p>
                  <strong>
                    {t(
                      'High severity incidents (visible):',
                      'హై సీవిరిటీ సంఘటనలు (కనిపిస్తున్నవి):'
                    )}
                  </strong>{' '}
                  {highSeverityIncidents}
                </p>
                <p>
                  <strong>
                    {t('Overall risk level:', 'మొత్తం రిస్క్ స్థాయి:')}
                  </strong>{' '}
                  {overallRisk}
                </p>
              </section>

              <section className="card">
                <h2>{t('Analytics', 'విశ్లేషణ')}</h2>
                {displayIncidents.length === 0 ? (
                  <p>
                    {t(
                      'No data available for current filters / timeline.',
                      'ప్రస్తుత ఫిల్టర్ల / టైమ్‌లైన్‌కి డేటా లేదు.'
                    )}
                  </p>
                ) : (
                  <>
                    <h4>
                      {t('Incidents by Type', 'రకం వారీగా సంఘటనలు')}
                    </h4>
                    <div className="chart-wrapper">
                      <ResponsiveContainer>
                        <BarChart data={typeChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="type" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="count"
                            name={t('Incidents', 'సంఘటనలు')}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <h4 style={{ marginTop: '0.75rem' }}>
                      {t(
                        'Incidents by Severity',
                        'సీవిరిటీ వారీగా సంఘటనలు'
                      )}
                    </h4>
                    <div className="chart-wrapper">
                      <ResponsiveContainer>
                        <BarChart data={severityChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="severity" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="count"
                            name={t('Incidents', 'సంఘటనలు')}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </section>
            </div>

            <div className="column">
              <section className="card">
                <h2>{t('Filters', 'ఫిల్టర్లు')}</h2>

                <div className="form-row">
                  <label>
                    {t('Type:', 'రకం:')}
                    <select
                      value={filters.type}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }))
                      }
                    >
                      <option value="all">{t('All', 'అన్నీ')}</option>
                      <option value="flood">{t('Flood', 'వరద')}</option>
                      <option value="fire">
                        {t('Fire', 'అగ్ని ప్రమాదం')}
                      </option>
                      <option value="accident">
                        {t('Accident', 'రోడ్ ప్రమాదం')}
                      </option>
                      <option value="storm">
                        {t('Storm', 'తుఫాను / భారీ వర్షం')}
                      </option>
                      <option value="other">
                        {t('Other', 'ఇతర')}
                      </option>
                    </select>
                  </label>
                </div>

                <div className="form-row">
                  <label>
                    {t('Severity:', 'సీవిరిటీ:')}
                    <select
                      value={filters.severity}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          severity: e.target.value,
                        }))
                      }
                    >
                      <option value="all">{t('All', 'అన్నీ')}</option>
                      <option value="low">
                        {t('Low', 'తక్కువ')}
                      </option>
                      <option value="medium">
                        {t('Medium', 'మధ్యస్థ')}
                      </option>
                      <option value="high">
                        {t('High', 'ఎక్కువ')}
                      </option>
                    </select>
                  </label>
                </div>

                <div className="form-row">
                  <label>
                    {t('Time Range:', 'సమయ పరిధి:')}
                    <select
                      value={filters.timeRange}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          timeRange: e.target.value,
                        }))
                      }
                    >
                      <option value="all">{t('All', 'అన్నీ')}</option>
                      <option value="1">
                        {t('Last 1 hour', 'గత 1 గంట')}
                      </option>
                      <option value="6">
                        {t('Last 6 hours', 'గత 6 గంటలు')}
                      </option>
                      <option value="24">
                        {t('Last 24 hours', 'గత 24 గంటలు')}
                      </option>
                      <option value="168">
                        {t('Last 7 days', 'గత 7 రోజులు')}
                      </option>
                    </select>
                  </label>
                </div>

                <div className="form-row">
                  <label>
                    {t('Max incidents:', 'గరిష్ట సంఘటనలు:')}
                    <select
                      value={filters.maxCount}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          maxCount: e.target.value,
                        }))
                      }
                    >
                      <option value="all">
                        {t('All available', 'అన్నీ')}
                      </option>
                      <option value="50">
                        {t('Latest 50', 'తాజా 50')}
                      </option>
                      <option value="100">
                        {t('Latest 100', 'తాజా 100')}
                      </option>
                      <option value="200">
                        {t('Latest 200', 'తాజా 200')}
                      </option>
                    </select>
                  </label>
                </div>

                <div className="form-row row-inline">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showDensity}
                      onChange={(e) =>
                        setShowDensity(e.target.checked)
                      }
                    />
                    {t(
                      'Show density overlay on map',
                      'మ్యాప్‌పై డెన్సిటీ చూపించు'
                    )}
                  </label>
                </div>

                <div className="form-row row-inline">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={timePlaybackEnabled}
                      onChange={(e) =>
                        setTimePlaybackEnabled(e.target.checked)
                      }
                    />
                    {t(
                      'Enable time playback',
                      'టైమ్ ప్లేబ్యాక్ ఆన్ చేయి'
                    )}
                  </label>
                </div>

                {timePlaybackEnabled &&
                  earliestTs !== null &&
                  latestTs !== null && (
                    <div className="time-slider">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={playbackSlider}
                        onChange={(e) =>
                          setPlaybackSlider(
                            Number(e.target.value)
                          )
                        }
                      />
                      <div className="time-slider-info">
                        {t(
                          'Showing incidents up to:',
                          'ఈ సమయం వరకు సంఘటనలు:'
                        )}{' '}
                        <strong>
                          {new Date(
                            cutoffTs || latestTs
                          ).toLocaleString()}
                        </strong>{' '}
                        ({playbackSlider}%)
                      </div>
                    </div>
                  )}

                <div className="form-actions">
                  <button onClick={fetchIncidents}>
                    {t('Apply Filters', 'ఫిల్టర్లు అప్లై చేయి')}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="btn-secondary"
                  >
                    {t(
                      'Export visible incidents (CSV)',
                      'కనిపించే సంఘటనలను CSV గా ఎగుమతి చేయి'
                    )}
                  </button>
                </div>
              </section>

              <section className="card">
                <h2>
                  {t(
                    'Recent Incidents (after filters & timeline)',
                    'తాజా సంఘటనలు (ఫిల్టర్ల & టైమ్‌లైన్ తర్వాత)'
                  )}
                </h2>
                {loadingIncidents ? (
                  <p>
                    {t(
                      'Loading incidents...',
                      'సంఘటనలు లోడ్ అవుతున్నాయి...'
                    )}
                  </p>
                ) : displayIncidents.length === 0 ? (
                  <p>
                    {t(
                      'No incidents match current filters / timeline.',
                      'ప్రస్తుత ఫిల్టర్ల / టైమ్‌లైన్‌కి సరిపడే సంఘటనలు లేవు.'
                    )}
                  </p>
                ) : (
                  <ul className="incident-list">
                    {displayIncidents.slice(0, 10).map((inc) => (
                      <li key={inc._id}>
                        <span className="badge badge-type">
                          {inc.type.toUpperCase()}
                        </span>
                        <span className={`badge badge-${inc.severity}`}>
                          {inc.severity}
                        </span>
                        <div className="incident-main">
                          <div className="incident-line">
                            {inc.lat.toFixed(4)},{' '}
                            {inc.lng.toFixed(4)} •{' '}
                            {new Date(
                              inc.createdAt
                            ).toLocaleString()}
                          </div>
                          {inc.description && (
                            <div className="incident-desc">
                              {inc.description}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}

        {/* OPERATIONS PAGE */}
        {activePage === 'operations' && (
          <div className="page-grid">
            <div className="column">
              <section className="card">
                <h2>
                  {t(
                    'Report New Incident',
                    'కొత్త సంఘటన రిపోర్ట్ చేయి'
                  )}
                </h2>
                <p className="card-hint">
                  {t(
                    'Click the map in "New incident" mode to auto-fill coordinates.',
                    '"New incident" మోడ్‌లో మ్యాప్‌పై క్లిక్ చేస్తే లొకేషన్ ఆటో ఫిల్ అవుతుంది.'
                  )}
                </p>
                <form onSubmit={handleCreateIncident}>
                  <div className="form-row">
                    <label>
                      {t('Type:', 'రకం:')}
                      <select
                        value={formData.type}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            type: e.target.value,
                          }))
                        }
                      >
                        <option value="flood">
                          {t(
                            'Flood / Waterlogging',
                            'వరద / నీటి నిల్వ'
                          )}
                        </option>
                        <option value="fire">
                          {t(
                            'Fire / Smoke',
                            'అగ్ని ప్రమాదం / పొగ'
                          )}
                        </option>
                        <option value="accident">
                          {t(
                            'Accident / Road Block',
                            'రోడ్ ప్రమాదం / బ్లాక్'
                          )}
                        </option>
                        <option value="storm">
                          {t(
                            'Storm / Heavy Rain',
                            'తుఫాను / భారీ వర్షం'
                          )}
                        </option>
                        <option value="other">
                          {t('Other', 'ఇతర')}
                        </option>
                      </select>
                    </label>
                  </div>

                  <div className="form-row">
                    <label>
                      {t('Severity:', 'సీవిరిటీ:')}
                      <select
                        value={formData.severity}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            severity: e.target.value,
                          }))
                        }
                      >
                        <option value="low">
                          {t('Low', 'తక్కువ')}
                        </option>
                        <option value="medium">
                          {t('Medium', 'మధ్యస్థ')}
                        </option>
                        <option value="high">
                          {t('High', 'ఎక్కువ')}
                        </option>
                      </select>
                    </label>
                  </div>

                  <div className="form-row">
                    <label>
                      {t('Description:', 'వివరణ:')}
                      <div className="input-with-button">
                        <input
                          type="text"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder={t(
                            'Optional',
                            'ఐచ్చికం'
                          )}
                        />
                        <button
                          type="button"
                          onClick={handleStartVoice}
                          disabled={isRecording}
                          className="btn-outline"
                        >
                          {isRecording
                            ? t('Listening...', 'వింటోంది...')
                            : t('🎤 Speak', '🎤 మాట్లాడి')}
                        </button>
                      </div>
                    </label>
                  </div>

                  <div className="form-row two-cols">
                    <label>
                      {t('Latitude:', 'అక్షాంశం:')}
                      <input
                        type="number"
                        value={formData.lat}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            lat: e.target.value,
                          }))
                        }
                        step="0.00001"
                      />
                    </label>
                    <label>
                      {t('Longitude:', 'రేఖాంశం:')}
                      <input
                        type="number"
                        value={formData.lng}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            lng: e.target.value,
                          }))
                        }
                        step="0.00001"
                      />
                    </label>
                  </div>

                  <div className="form-actions">
                    <button type="submit">
                      {t(
                        'Submit Incident',
                        'సంఘటనను సబ్మిట్ చేయి'
                      )}
                    </button>
                  </div>
                </form>
              </section>

              <section className="card">
                <h2>
                  {t(
                    'Check Route Safety',
                    'రూట్ భద్రతను చెక్ చేయి'
                  )}
                </h2>
                <p className="card-hint">
                  {t(
                    'Use "Route start" / "Route end" map modes to pick coordinates.',
                    '"Route start" / "Route end" మోడ్‌లతో మ్యాప్‌పై క్లిక్ చేసి కోఆర్డినేట్లు సెట్ చేయండి.'
                  )}
                </p>
                <form onSubmit={handleRouteCheck}>
                  <div className="form-row two-cols">
                    <label>
                      {t('Start Lat:', 'స్టార్ట్ అక్షాంశం:')}
                      <input
                        type="number"
                        value={routeForm.startLat}
                        onChange={(e) =>
                          setRouteForm((prev) => ({
                            ...prev,
                            startLat: e.target.value,
                          }))
                        }
                        step="0.00001"
                      />
                    </label>
                    <label>
                      {t('Start Lng:', 'స్టార్ట్ రేఖాంశం:')}
                      <input
                        type="number"
                        value={routeForm.startLng}
                        onChange={(e) =>
                          setRouteForm((prev) => ({
                            ...prev,
                            startLng: e.target.value,
                          }))
                        }
                        step="0.00001"
                      />
                    </label>
                  </div>

                  <div className="form-row two-cols">
                    <label>
                      {t('End Lat:', 'ఎండ్ అక్షాంశం:')}
                      <input
                        type="number"
                        value={routeForm.endLat}
                        onChange={(e) =>
                          setRouteForm((prev) => ({
                            ...prev,
                            endLat: e.target.value,
                          }))
                        }
                        step="0.00001"
                      />
                    </label>
                    <label>
                      {t('End Lng:', 'ఎండ్ రేఖాంశం:')}
                      <input
                        type="number"
                        value={routeForm.endLng}
                        onChange={(e) =>
                          setRouteForm((prev) => ({
                            ...prev,
                            endLng: e.target.value,
                          }))
                        }
                        step="0.00001"
                      />
                    </label>
                  </div>

                  <div className="form-actions">
                    <button type="submit">
                      {t(
                        'Check Safety',
                        'భద్రత చెక్ చేయి'
                      )}
                    </button>
                  </div>
                </form>

                {routeError && (
                  <p className="error-text">{routeError}</p>
                )}

                {routeResult && (
                  <div className="route-result">
                    <p>
                      <strong>{t('Score:', 'స్కోర్:')}</strong>{' '}
                      {routeResult.score}/100
                    </p>
                    <p>
                      <strong>{t('Label:', 'లేబుల్:')}</strong>{' '}
                      {routeResult.label}
                    </p>
                    <p>{routeResult.message}</p>
                    <p>
                      <strong>
                        {t(
                          'Incidents near route:',
                          'రూట్ దగ్గర సంఘటనలు:'
                        )}
                      </strong>{' '}
                      {routeResult.nearbyCount}
                    </p>
                  </div>
                )}
              </section>
            </div>

            <div className="column">
              <section className="card card-map">
                <div className="card-header-row">
                  <div>
                    <h2>{t('Live Map', 'లైవ్ మ్యాప్')}</h2>
                    <p className="card-hint">
                      {t(
                        'View all incidents, density and your current position.',
                        'అన్ని సంఘటనలు, డెన్సిటీ & మీ లొకేషన్ చూడండి.'
                      )}
                    </p>
                  </div>
                  <div className="map-buttons">
                    <button
                      onClick={handleLocateMe}
                      disabled={locating}
                    >
                      {locating
                        ? t(
                            'Locating you...',
                            'మీ లొకేషన్ తీసుకుంటోంది...'
                          )
                        : t(
                            'Locate Me',
                            'నా లొకేషన్ చెక్ చేయి'
                          )}
                    </button>
                    <button
                      onClick={handleQuickSOS}
                      disabled={sosLoading}
                      className="btn-danger"
                    >
                      {sosLoading
                        ? t(
                            'Sending SOS...',
                            'SOS పంపుతోంది...'
                          )
                        : t(
                            '🚨 Quick SOS',
                            '🚨 క్విక్ SOS'
                          )}
                    </button>
                  </div>
                </div>

                {userRiskText && (
                  <p className="user-risk">{userRiskText}</p>
                )}

                {proximityStats && (
                  <div className="radar-card">
                    <strong>
                      {t(
                        'Nearby Risk Radar',
                        'దగ్గర రిస్క్ రాడార్'
                      )}
                    </strong>
                    <table>
                      <thead>
                        <tr>
                          <th>{t('Radius', 'రేడియస్')}</th>
                          <th>{t('Total', 'మొత్తం')}</th>
                          <th>
                            {t(
                              'High severity',
                              'హై సీవిరిటీ'
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {proximityStats.map((row) => (
                          <tr key={row.label}>
                            <td>{row.label}</td>
                            <td>{row.total}</td>
                            <td>{row.high}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="map-mode-toggle">
                  <span>
                    {t(
                      'Map click mode:',
                      'మ్యాప్ క్లిక్ మోడ్:'
                    )}
                  </span>
                  <label>
                    <input
                      type="radio"
                      value="incident"
                      checked={mapClickMode === 'incident'}
                      onChange={() =>
                        setMapClickMode('incident')
                      }
                    />
                    {t(
                      'New incident',
                      'క్రొత్త సంఘటన'
                    )}
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="routeStart"
                      checked={mapClickMode === 'routeStart'}
                      onChange={() =>
                        setMapClickMode('routeStart')
                      }
                    />
                    {t('Route start', 'రూట్ స్టార్ట్')}
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="routeEnd"
                      checked={mapClickMode === 'routeEnd'}
                      onChange={() =>
                        setMapClickMode('routeEnd')
                      }
                    />
                    {t('Route end', 'రూట్ ఎండ్')}
                  </label>
                </div>

                <div className="map-inner">
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <MapClickHandler onMapClick={handleMapClick} />
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {hasRouteCoords && (
                      <Polyline positions={routeLinePositions} />
                    )}

                    {userLocation && (
                      <>
                        <Circle
                          center={userLocation}
                          radius={200}
                          pathOptions={{
                            color: 'blue',
                            fillColor: 'blue',
                            fillOpacity: 0.15,
                          }}
                        />
                        <Marker
                          position={userLocation}
                          icon={userIcon}
                        >
                          <Popup>
                            {t(
                              'You are here',
                              'మీరు ఇక్కడ ఉన్నారు'
                            )}
                          </Popup>
                        </Marker>
                      </>
                    )}

                    {showDensity &&
                      displayIncidents.map((inc) => (
                        <Circle
                          key={`${inc._id}-circle`}
                          center={[inc.lat, inc.lng]}
                          radius={getRadiusForSeverity(
                            inc.severity
                          )}
                          pathOptions={{
                            color: getColorForSeverity(
                              inc.severity
                            ),
                            fillColor: getColorForSeverity(
                              inc.severity
                            ),
                            fillOpacity: 0.15,
                          }}
                        />
                      ))}

                    {displayIncidents.map((inc) => (
                      <Marker
                        key={inc._id}
                        position={[inc.lat, inc.lng]}
                        icon={
                          severityIcons[inc.severity] ||
                          severityIcons.medium
                        }
                      >
                        <Popup>
                          <strong>
                            {inc.type.toUpperCase()}
                          </strong>{' '}
                          ({inc.severity})<br />
                          {inc.description ||
                            t(
                              'No description',
                              'వివరణ లేదు'
                            )}
                          <br />
                          {new Date(
                            inc.createdAt
                          ).toLocaleString()}
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ADMIN PAGE */}
        {activePage === 'admin' && (
          <div className="page-grid">
            <div className="column">
              <section className="card">
                <h2>{t('Admin Mode', 'అడ్మిన్ మోడ్')}</h2>
                <p className="card-hint">
                  {t(
                    'Turn on admin to run simulations and delete incidents.',
                    'సిమ్యులేషన్స్ రన్ చేయడానికి, సంఘటనలు డిలీట్ చేయడానికి అడ్మిన్ మోడ్ ఆన్ చేయండి.'
                  )}
                </p>
                <p>
                  {t('Current mode:', 'ప్రస్తుత మోడ్:')}{' '}
                  <strong>
                    {isAdmin
                      ? t('ADMIN', 'అడ్మిన్')
                      : t('VIEW ONLY', 'చూడడం మాత్రమే')}
                  </strong>
                </p>
                {!isAdmin ? (
                  <>
                    <div className="form-row">
                      <label>
                        {t(
                          'Admin password:',
                          'అడ్మిన్ పాస్‌వర్డ్:'
                        )}
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) =>
                            setAdminPassword(e.target.value)
                          }
                          placeholder={t(
                            'Enter admin password',
                            'అడ్మిన్ పాస్‌వర్డ్ ఇవ్వండి'
                          )}
                        />
                      </label>
                    </div>
                    <button onClick={handleAdminLogin}>
                      {t(
                        'Unlock Admin',
                        'అడ్మిన్ అన్‌లాక్'
                      )}
                    </button>
                    {adminError && (
                      <p className="error-text">{adminError}</p>
                    )}
                    <p className="card-hint">
                      {t(
                        'Demo password:',
                        'డెమో పాస్‌వర్డ్:'
                      )}{' '}
                      <code>guardian123</code>
                    </p>
                  </>
                ) : (
                  <button
                    onClick={handleAdminLogout}
                    className="btn-outline"
                  >
                    {t('Lock Admin', 'అడ్మిన్ లాక్')}
                  </button>
                )}
              </section>

              <section className="card">
                <h2>
                  {t(
                    'Quick Demo Scenarios',
                    'శీఘ్ర డెమో సన్నివేశాలు'
                  )}
                </h2>
                {!isAdmin ? (
                  <p>
                    {t(
                      'Enable Admin Mode to run simulations and clear demo data.',
                      'సిమ్యులేషన్లు రన్ చేయడానికి, డెమో డేటా క్లియర్ చేయడానికి అడ్మిన్ మోడ్ ఆన్ చేయండి.'
                    )}
                  </p>
                ) : (
                  <>
                    <p className="card-hint">
                      {t(
                        'Use these to instantly generate realistic hotspots for demo.',
                        'డెమో కోసం వాస్తవానికి దగ్గరగా ఉండే హాట్‌స్పాట్స్ సిమ్యులేట్ చేయడానికి వీటిని వాడండి.'
                      )}
                    </p>
                    <div className="form-actions">
                      <button
                        onClick={() =>
                          handleScenario('bhimavaramFlood')
                        }
                        disabled={scenarioLoading}
                      >
                        {scenarioLoading
                          ? t(
                              'Working...',
                              'లోడ్ అవుతోంది...'
                            )
                          : t(
                              'Simulate Flood in Bhimavaram',
                              'భీమవరం వరద సిమ్యులేట్ చేయి'
                            )}
                      </button>
                      <button
                        onClick={() =>
                          handleScenario('cityStorm')
                        }
                        disabled={scenarioLoading}
                        className="btn-outline"
                      >
                        {scenarioLoading
                          ? t(
                              'Working...',
                              'లోడ్ అవుతోంది...'
                            )
                          : t(
                              'Simulate City-wide Storm',
                              'పట్టణం మొత్తం తుఫాను సిమ్యులేట్ చేయి'
                            )}
                      </button>
                    </div>
                    <button
                      onClick={handleClearDemoData}
                      disabled={scenarioLoading}
                      className="btn-danger"
                    >
                      {scenarioLoading
                        ? t(
                            'Clearing...',
                            'క్లియర్ అవుతోంది...'
                          )
                        : t(
                            'Clear Demo Data (Admin only)',
                            'డెమో డేటా క్లియర్ చేయి (అడ్మిన్ మాత్రమే)'
                          )}
                    </button>
                    <p className="card-hint">
                      {t(
                        'Simulated incidents are detected by descriptions starting with "Simulated ".',
                        '"Simulated " తో మొదలయ్యే వివరణల ద్వారా డెమో సంఘటనలు గుర్తిస్తాం.'
                      )}
                    </p>
                  </>
                )}
              </section>
            </div>

            <div className="column">
              <section className="card">
                <h2>
                  {t(
                    'All Incidents (after filters & timeline)',
                    'అన్ని సంఘటనలు (ఫిల్టర్ల & టైమ్‌లైన్ తర్వాత)'
                  )}
                </h2>
                {loadingIncidents ? (
                  <p>
                    {t(
                      'Loading incidents...',
                      'సంఘటనలు లోడ్ అవుతున్నాయి...'
                    )}
                  </p>
                ) : displayIncidents.length === 0 ? (
                  <p>
                    {t(
                      'No incidents match current filters / timeline.',
                      'ప్రస్తుత ఫిల్టర్ల / టైమ్‌లైన్‌కి సరిపడే సంఘటనలు లేవు.'
                    )}
                  </p>
                ) : (
                  <ul className="incident-list full">
                    {displayIncidents.map((inc) => (
                      <li key={inc._id}>
                        <span className="badge badge-type">
                          {inc.type.toUpperCase()}
                        </span>
                        <span className={`badge badge-${inc.severity}`}>
                          {inc.severity}
                        </span>
                        <div className="incident-main">
                          <div className="incident-line">
                            {inc.lat.toFixed(4)}, {inc.lng.toFixed(4)} •{' '}
                            {new Date(
                              inc.createdAt
                            ).toLocaleString()}
                          </div>
                          {inc.description && (
                            <div className="incident-desc">
                              {inc.description}
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() =>
                              handleDeleteIncident(inc._id)
                            }
                            className="btn-danger small"
                          >
                            {t('Delete', 'డిలీట్')}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}

        {/* HELP PAGE */}
        {activePage === 'help' && (
          <div className="page-single">
            <section className="card">
              <h2>{t('How to demo this project', 'ఈ ప్రాజెక్ట్ డెమో ఎలా చేయాలి')}</h2>
              <ol className="help-list">
                <li>
                  <strong>Dashboard tab:</strong> Explain the <em>Overview</em> stats, severity-wise risk and charts.
                </li>
                <li>
                  <strong>Live Operations tab:</strong> Show:
                  <ul>
                    <li>Map with live incidents + density overlay</li>
                    <li>
                      <code>Locate Me</code> + <code>Nearby Risk Radar</code>
                    </li>
                    <li>
                      <code>🚨 Quick SOS</code> from your location
                    </li>
                    <li>Voice-based incident reporting using the mic button</li>
                  </ul>
                </li>
                <li>
                  <strong>Admin & Simulations tab:</strong> Unlock admin, generate simulated disasters, and clear demo data.
                </li>
                <li>
                  <strong>Language toggle:</strong> Switch between EN/TE and mention local-language focus.
                </li>
              </ol>
              <p className="card-hint">
                You can say:{" "}
                <em>
                  “Disaster Guardian gives a control room a single pane of glass
                  for nearby risk, live incidents, safe routing and quick SOS
                  reporting — in both English and Telugu.”
                </em>
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
