import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Trash2, Upload, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";

export default function App() {
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState("");
  const [filterTable, setFilterTable] = useState("0");      // SIEMPRE string
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Cargar datos desde localStorage al montar
  useEffect(() => {
    const loadData = () => {
      try {
        const saved = localStorage.getItem("app-people-data");
        if (saved) {
          const parsed = JSON.parse(saved);
          setPeople(parsed);
        }
      } catch (e) {
        console.log("Error al cargar datos", e);
      }
    };
    loadData();
  }, []);

  // Guardar datos en localStorage cada vez que cambia people
  useEffect(() => {
    try {
      localStorage.setItem("app-people-data", JSON.stringify(people));
    } catch (e) {
      console.log("Error al guardar datos", e);
    }
  }, [people]);

  const addPerson = (p) => {
    setPeople([
      ...people,
      {
        ...p,
        id: Date.now(),
        arrived: false,
        missing: false,
      },
    ]);
  };

  const toggleArrived = (id) => {
    setPeople(
      people.map((p) =>
        p.id === id ? { ...p, arrived: !p.arrived, missing: false } : p
      )
    );
  };

  const toggleMissing = (id) => {
    setPeople(
      people.map((p) =>
        p.id === id ? { ...p, missing: !p.missing, arrived: false } : p
      )
    );
  };

  const deletePerson = (id) => {
    setPeople(people.filter((p) => p.id !== id));
  };

  const clearAll = () => {
    if (
      window.confirm(
        "¿Estás seguro de que deseas eliminar todas las personas y reiniciar?"
      )
    ) {
      setPeople([]);
      localStorage.removeItem("app-people-data");
      setSearch("");
      setFilterTable("0");
      setFilterStatus("all");
      setCurrentPage(1);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const imported = [];
      for (let i = 1; i < rows.length; i++) {
        const [nombre, apellidos, mesaRaw, invitadosRaw] = rows[i];
        if (!nombre || !apellidos || !mesaRaw) continue;

        let mesa;
        // Verificar si es "principal"
        if (String(mesaRaw).toLowerCase() === "principal") {
          mesa = "principal"; // STRING
        } else {
          const mesaNum = Number(mesaRaw);
          if (isNaN(mesaNum) || mesaNum < 1 || mesaNum > 22) continue;
          mesa = String(mesaNum); // guardamos como STRING
        }

        const invitados = Math.min(Number(invitadosRaw) || 0, 8);

        imported.push({
          id: Date.now() + i,
          nombre: String(nombre).trim(),
          apellidos: String(apellidos).trim(),
          mesa,              // ahora siempre string ("1".."22" o "principal")
          invitados,
          arrived: false,
          missing: false,
        });
      }

      setPeople((prev) => [...prev, ...imported]);
      alert(`Se importaron ${imported.length} personas correctamente`);
    } catch (err) {
      console.error(err);
      alert("Error al importar el archivo");
    }
    e.target.value = "";
  };

  // FILTRO
  const filtered = people.filter((p) => {
    const text = `${p.nombre} ${p.apellidos}`.toLowerCase();
    const matchSearch = text.includes(search.toLowerCase());

    // mesa siempre como string para comparar
    const personMesa = String(p.mesa).toLowerCase();
    const selectedMesa = String(filterTable).toLowerCase();

    const matchTable =
      selectedMesa === "0" || personMesa === selectedMesa; // "0" = todas

    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "arrived" && p.arrived) ||
      (filterStatus === "missing" && p.missing) ||
      (filterStatus === "pending" && !p.arrived && !p.missing);

    return matchSearch && matchTable && matchStatus;
  });

  // Paginación
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentSafePage = Math.min(currentPage, totalPages);
  const startIndex = (currentSafePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPeople = filtered.slice(startIndex, endIndex);

  // Reset página si cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterTable, filterStatus]);

  const stats = {
    total: people.length,
    arrived: people.filter((p) => p.arrived).length,
    missing: people.filter((p) => p.missing).length,
    pending: people.filter((p) => !p.arrived && !p.missing).length,
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1 className="title">📋 Gestión de Mesas</h1>
        <p className="subtitle">Evento - Control de Asistencia</p>
      </div>

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card total">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card arrived">
          <span className="stat-number">{stats.arrived}</span>
          <span className="stat-label">Llegaron</span>
        </div>
        <div className="stat-card missing">
          <span className="stat-number">{stats.missing}</span>
          <span className="stat-label">Faltantes</span>
        </div>
        <div className="stat-card pending">
          <span className="stat-number">{stats.pending}</span>
          <span className="stat-label">Pendientes</span>
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="search-section">
        <input
          className="input search-input"
          type="text"
          placeholder="🔍 Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filter-row">
          <select
            className="select filter-select"
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)} // STRING
          >
            <option value="0">Todas las mesas</option>
            <option value="principal">🏆 Mesa Principal</option>
            {Array.from({ length: 22 }).map((_, i) => (
              <option key={i} value={String(i + 1)}>{`Mesa ${i + 1}`}</option>
            ))}
          </select>

          <select
            className="select filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="arrived">Llegaron ✓</option>
            <option value="missing">Faltantes ✗</option>
            <option value="pending">Pendientes</option>
          </select>
        </div>
      </div>

      {/* Importar Excel */}
      <div className="import-box">
        <label className="import-label">
          <Upload size={18} />
          <span>Importar desde Excel</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="file-input"
          />
        </label>
        <p className="import-note">
          Formato: Nombre | Apellidos | Mesa (1-22 o "principal") | Invitados
          (máx. 8)
        </p>
      </div>

      {/* Formulario Agregar */}
      <AddForm addPerson={addPerson} />

      {/* Lista de Personas */}
      <div className="people-section">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>📭 No hay personas que mostrar</p>
          </div>
        ) : (
          <>
            <div className="people-list">
              {paginatedPeople.map((p) => (
                <PersonCard
                  key={p.id}
                  person={p}
                  onToggleArrived={() => toggleArrived(p.id)}
                  onToggleMissing={() => toggleMissing(p.id)}
                  onDelete={() => deletePerson(p.id)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn-page"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentSafePage === 1}
                >
                  ←
                </button>

                <div className="page-info">
                  <span className="page-numbers">
                    {currentSafePage} / {totalPages}
                  </span>
                </div>

                <button
                  className="btn-page"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentSafePage === totalPages}
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Botón Limpiar */}
      <button className="btn-danger" onClick={clearAll}>
        <RotateCcw size={18} />
        Limpiar Todo y Reiniciar
      </button>
    </div>
  );
}

function AddForm({ addPerson }) {
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [mesa, setMesa] = useState("1"); // string
  const [invitados, setInvitados] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const handleInvitadosChange = (e) => {
    let value = Number(e.target.value);
    if (value > 8) value = 8;
    if (value < 0) value = 0;
    setInvitados(value);
  };

  const submit = () => {
    if (!nombre.trim() || !apellidos.trim()) {
      alert("Por favor completa nombre y apellidos");
      return;
    }
    addPerson({
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      mesa,         // ya viene como "principal" o "1".."22"
      invitados,
    });
    setNombre("");
    setApellidos("");
    setMesa("1");
    setInvitados(0);
  };

  return (
    <div className="card-form">
      <button className="form-toggle" onClick={() => setExpanded(!expanded)}>
        <span>{expanded ? "−" : "+"} Agregar Persona</span>
      </button>

      {expanded && (
        <div className="form-content">
          <input
            className="input"
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <input
            className="input"
            type="text"
            placeholder="Apellidos"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
          />
          <select
            className="select"
            value={mesa}
            onChange={(e) => setMesa(e.target.value)}
          >
            <option value="principal">🏆 Mesa Principal</option>
            {Array.from({ length: 22 }).map((_, i) => (
              <option key={i} value={String(i + 1)}>{`Mesa ${i + 1}`}</option>
            ))}
          </select>

          <div className="invitados-input-group">
            <label className="invitados-label">Número de Invitados (máx. 8)</label>
            <div className="invitados-buttons">
              <button
                className="btn-guest-minus"
                onClick={() => setInvitados((prev) => Math.max(0, prev - 1))}
              >
                −
              </button>
              <input
                className="input-invitados"
                type="number"
                min="0"
                max="8"
                value={invitados}
                onChange={handleInvitadosChange}
              />
              <button
                className="btn-guest-plus"
                onClick={() => setInvitados((prev) => Math.min(8, prev + 1))}
              >
                +
              </button>
            </div>
          </div>

          <button className="btn-primary" onClick={submit}>
            ✓ Agregar
          </button>
        </div>
      )}
    </div>
  );
}

function PersonCard({ person, onToggleArrived, onToggleMissing, onDelete }) {
  const [guestsArrived, setGuestsArrived] = useState(0);

  const handleGuestsChange = (e) => {
    const value = Math.min(Number(e.target.value), person.invitados || 0);
    setGuestsArrived(value);
  };

  return (
    <div
      className={`person-card ${
        person.arrived ? "arrived" : ""
      } ${person.missing ? "missing" : ""}`}
    >
      <div className="person-info">
        <h3 className="person-name">
          {person.nombre} {person.apellidos}
        </h3>
        <p className="person-table">
          {String(person.mesa).toLowerCase() === "principal"
            ? "🏆 Mesa Principal"
            : `📍 Mesa ${person.mesa}`}
        </p>
      </div>

      <div className="person-guests">
        <div className="guests-badge">👥 {person.invitados || 0}</div>
      </div>

      <div className="guests-select-container">
        <select
          className="select-guests"
          value={guestsArrived}
          onChange={handleGuestsChange}
          disabled={!person.arrived}
          title="Seleccionar invitados que llegaron"
        >
          {Array.from({ length: (person.invitados || 0) + 1 }).map((_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>

      <div className="person-status">
        <div className="status-buttons">
          <button
            className={`btn-status btn-present ${
              person.arrived ? "active" : ""
            }`}
            onClick={onToggleArrived}
            title="Marcar como presente"
          >
            <CheckCircle size={24} />
            <span>Presente</span>
          </button>

          <button
            className={`btn-status btn-absent ${
              person.missing ? "active" : ""
            }`}
            onClick={onToggleMissing}
            title="Marcar como ausente"
          >
            <AlertCircle size={24} />
            <span>Ausente</span>
          </button>
        </div>

        <button
          className="btn-action btn-delete"
          onClick={onDelete}
          title="Eliminar persona"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {person.arrived && (
        <div className="badge arrived-badge">✓ Presente</div>
      )}
      {person.missing && <div className="badge missing-badge">✗ Ausente</div>}
      {!person.arrived && !person.missing && (
        <div className="badge pending-badge">⏳ Sin marcar</div>
      )}
    </div>
  );
}
