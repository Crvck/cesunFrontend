import React, { useState, useEffect } from 'react';
import { FiSearch, FiUserPlus, FiEdit2, FiTrash2, FiFilter, FiUser, FiMail, FiPhone, FiCheckCircle, FiXCircle, FiEye, FiEyeOff, FiBarChart2 } from 'react-icons/fi';
import './coordinador.css';
import notifications from '../../utils/notifications';
import confirmations from '../../utils/confirmations';
import { createCoordinatorTour } from '../../utils/coordinatorTour';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType } from 'docx';
import { saveAs } from 'file-saver';

const CoordinadorUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState('');
  const [includeInactivos, setIncludeInactivos] = useState(true); // mostrar inactivos por defecto
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('nuevo');
  const [showRecordatorioModal, setShowRecordatorioModal] = useState(false);
  const [recordatorioConfig, setRecordatorioConfig] = useState({
    recordatorio_citas_activo: true,
    recordatorio_citas_frecuencia_dias: 7,
    recordatorio_citas_rango_dias: 7,
    recordatorio_citas_hora: '09:00'
  });
  const [recordatorioLoading, setRecordatorioLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsUser, setStatsUser] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [tour] = useState(() => createCoordinatorTour('usuarios'));
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    rol: 'coterapeuta',
    especialidad: '',
    fundacion_id: '',
    activo: true,
    password: 'P@ssw0rd123', // contraseña temporal por defecto
    cambiarPassword: false // checkbox para cambiar contraseña en edición
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/users`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!res.ok) {
        // Si no es coordinador o token inválido, podemos mostrar un mensaje y seguir
        console.error('Error fetching users:', res.status);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setUsuarios(data);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecordatorioConfig = async () => {
    try {
      setRecordatorioLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/recordatorios/configuracion`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      const json = await res.json();
      if (!res.ok) {
        notifications.error(json.message || 'Error al cargar configuración');
        return;
      }

      setRecordatorioConfig({
        recordatorio_citas_activo: json.data.recordatorio_citas_activo ?? true,
        recordatorio_citas_frecuencia_dias: json.data.recordatorio_citas_frecuencia_dias ?? 7,
        recordatorio_citas_rango_dias: json.data.recordatorio_citas_rango_dias ?? 7,
        recordatorio_citas_hora: json.data.recordatorio_citas_hora ?? '09:00'
      });
    } catch (error) {
      console.error('Error cargando configuración de recordatorios:', error);
      notifications.error('Error al cargar configuración');
    } finally {
      setRecordatorioLoading(false);
    }
  };

  const handleGuardarRecordatorioConfig = async () => {
    try {
      setRecordatorioLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/recordatorios/configuracion`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(recordatorioConfig)
      });

      const json = await res.json();
      if (!res.ok) {
        notifications.error(json.message || 'Error al guardar configuración');
        return;
      }

      setRecordatorioConfig({
        recordatorio_citas_activo: json.data.recordatorio_citas_activo,
        recordatorio_citas_frecuencia_dias: json.data.recordatorio_citas_frecuencia_dias,
        recordatorio_citas_rango_dias: json.data.recordatorio_citas_rango_dias,
        recordatorio_citas_hora: json.data.recordatorio_citas_hora
      });

      notifications.success('Configuración guardada');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      notifications.error('Error al guardar configuración');
    } finally {
      setRecordatorioLoading(false);
    }
  };

  const handleEnviarRecordatorios = async () => {
    try {
      setRecordatorioLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/recordatorios/enviar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      const json = await res.json();
      if (!res.ok) {
        notifications.error(json.message || 'Error al enviar recordatorios');
        return;
      }

      notifications.success('Recordatorios enviados');
    } catch (error) {
      console.error('Error enviando recordatorios:', error);
      notifications.error('Error al enviar recordatorios');
    } finally {
      setRecordatorioLoading(false);
    }
  };

  const openStatsModal = async (usuario) => {
    setStatsUser(usuario);
    setShowStatsModal(true);
    setStatsData(null);
    setStatsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/users/${usuario.id}/estadisticas`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!res.ok) {
        notifications.error('Error al obtener estadísticas');
        return;
      }

      const data = await res.json();
      setStatsData(data);
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      notifications.error('Error al obtener estadísticas');
    } finally {
      setStatsLoading(false);
    }
  };

  const closeStatsModal = () => {
    setShowStatsModal(false);
    setStatsUser(null);
    setStatsData(null);
  };

  const filteredUsuarios = usuarios.filter(usuario => {
    const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.toLowerCase();
    const email = (usuario.email || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = nombreCompleto.includes(searchLower) || email.includes(searchLower);
    const matchesRol = !filterRol || usuario.rol === filterRol;
    const matchesActivo = includeInactivos ? true : usuario.activo;

    return matchesSearch && matchesRol && matchesActivo;
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Si cambia el rol y estamos creando un nuevo usuario, establecer contraseña temporal por defecto
    setFormData(prev => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      if (name === 'rol' && modalType === 'nuevo') {
        // Mantener la contraseña temporal por defecto
        next.password = 'P@ssw0rd123';
      }

      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modalType === 'nuevo') {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.REACT_APP_API_URL;
        const res = await fetch(`${apiUrl}/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          notifications.error(err.message || 'Error creando usuario');
          return;
        }

        const created = await res.json();
        // Agregar el nuevo usuario a la lista local
        setUsuarios(prev => [...prev, {
          ...created,
          horas_liberadas: 0,
          horas_objetivo: 0
        }]);
        notifications.success('Usuario creado exitosamente');
      } catch (error) {
        console.error('Error creando usuario:', error);
        notifications.error('Error creando usuario');
      }
    } else {
      // Editar usuario: enviar al backend
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.REACT_APP_API_URL;
        // En modo edición, solo incluir password si cambiarPassword es true
        const dataToSend = { ...formData };
        if (!dataToSend.cambiarPassword) {
          delete dataToSend.password;
        }
        delete dataToSend.cambiarPassword; // no enviar el campo checkbox al backend

        const res = await fetch(`${apiUrl}/api/users/${formData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(dataToSend)
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          notifications.error(err.message || 'Error actualizando usuario');
          return;
        }

        const response = await res.json();
        const updated = response.data || response;

        // Actualizar el usuario en la lista local
        setUsuarios(prev => prev.map(u => {
          if (u.id === updated.id) {
            return {
              ...u,
              nombre: updated.nombre,
              apellido: updated.apellido,
              email: updated.email,
              telefono: updated.telefono,
              rol: updated.rol,
              especialidad: updated.especialidad,
              fundacion_id: updated.fundacion_id,
              activo: updated.activo,
              fecha_registro: updated.fecha_registro || u.fecha_registro,
              horas_liberadas: u.horas_liberadas,
              horas_objetivo: u.horas_objetivo
            };
          }
          return u;
        }));

        notifications.success('Usuario actualizado exitosamente');
      } catch (error) {
        console.error('Error actualizando usuario:', error);
        notifications.error('Error actualizando usuario');
      }
    }

    setShowModal(false);
    resetForm();
  };

  const deleteUsuario = async (id) => {
    const confirmado = await confirmations.danger('¿Seguro que desea eliminar este usuario?');
    if (!confirmado) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notifications.error(err.message || 'Error eliminando usuario');
        return;
      }

      const payload = await res.json().catch(() => ({}));
      // Refrescar la lista completa para mostrar el usuario inactivado
      await fetchUsuarios();
      notifications.success('Usuario inactivado correctamente');
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      notifications.error('Error eliminando usuario');
    }
  };

  const editarUsuario = (usuario) => {
    // Mapear fecha si es string
    const mapped = {
      ...usuario,
      password: 'P@ssw0rd123'
    };
    setFormData(mapped);
    setModalType('editar');
    setShowModal(true);
  };

  const toggleEstadoUsuario = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      // Encontrar usuario actual
      const usuario = usuarios.find(u => u.id === id);
      if (!usuario) return;

      const res = await fetch(`${apiUrl}/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ activo: !usuario.activo })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notifications.error(err.message || 'Error al cambiar estado');
        return;
      }

      const response = await res.json();
      const updated = response.data || response;

      // Actualizar el usuario en la lista local
      setUsuarios(prev => prev.map(u => {
        if (u.id === id) {
          return {
            ...u,
            activo: updated.activo,
            nombre: updated.nombre,
            apellido: updated.apellido,
            email: updated.email,
            telefono: updated.telefono,
            rol: updated.rol,
            especialidad: updated.especialidad,
            fundacion_id: updated.fundacion_id,
            fecha_registro: updated.fecha_registro || u.fecha_registro
          };
        }
        return u;
      }));

      notifications.success(`Usuario ${!usuario.activo ? 'activado' : 'desactivado'} correctamente`);
    } catch (error) {
      console.error('Error toggling activo:', error);
      notifications.error('Error cambiando estado de usuario');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      rol: 'coterapeuta',
      especialidad: '',
      fundacion_id: '',
      activo: true,
      password: 'P@ssw0rd123',
      cambiarPassword: false
    });
  };

  const exportarListado = async () => {
    try {

      const titulo = filterRol ? `Listado de ${getRolLabel(filterRol).text}` : 'Listado de todos los usuarios';
      const fecha = new Date().toLocaleString();
      const rows = [];

      // Header
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nombre', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Email', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Teléfono', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Rol', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Especialidad', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Fecha Registro', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Estado', bold: true })] })] }),
        ],
      }));

      filteredUsuarios.forEach(u => {
        rows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(`${u.nombre} ${u.apellido}`)] }),
            new TableCell({ children: [new Paragraph(u.email || '')] }),
            new TableCell({ children: [new Paragraph(u.telefono || '')] }),
            new TableCell({ children: [new Paragraph(getRolLabel(u.rol).text)] }),
            new TableCell({ children: [new Paragraph(u.especialidad || '')] }),
            new TableCell({ children: [new Paragraph(u.fecha_registro ? new Date(u.fecha_registro).toLocaleDateString() : '')] }),
            new TableCell({ children: [new Paragraph(u.activo ? 'Activo' : 'Inactivo')] }),
          ],
        }));
      });

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ text: titulo, heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: `Generado: ${fecha}`, spacing: { after: 200 } }),
            new Table({ rows })
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${titulo.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`);
      notifications.success('Descarga iniciada');
    } catch (err) {
      console.error('Error exportando listado:', err);
      notifications.error('Error exportando listado');
    }
  };

  const getRolLabel = (rol) => {
    switch (rol) {
      case 'coordinador':
        return { text: 'Coordinador', color: 'primary' };
      case 'terapeuta':
        return { text: 'Terapeuta', color: 'success' };
      case 'coterapeuta':
        return { text: 'Coterapeuta', color: 'warning' };
      case 'psicopedagogico':
        return { text: 'Psicopedagógico', color: 'secondary' };
      default:
        return { text: rol, color: 'info' };
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="configuracion-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p>Administración de coordinadores, terapeutas y coterapeutas</p>
        </div>
        <div className="flex-row gap-10">
          <button className="btn-secondary" onClick={() => tour.drive()}>
            Tour
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setModalType('nuevo');
              setShowModal(true);
            }}
          >
            <FiUserPlus /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="filters-container mb-20">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar usuario por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <select
            value={filterRol}
            onChange={(e) => setFilterRol(e.target.value)}
            className="select-field"
            style={{ width: '200px' }}
          >
            <option value="">Todos los roles</option>
            <option value="coordinador">Coordinadores</option>
            <option value="psicopedagogico">Psicopedagógicos</option>
            <option value="terapeuta">Terapeutas</option>
            <option value="coterapeuta">Coterapeutas</option>
          </select>

          <label className="ml-10 flex-row align-center">
            <input
              type="checkbox"
              checked={includeInactivos}
              onChange={(e) => setIncludeInactivos(e.target.checked)}
            />
            <span className="ml-5">Incluir inactivos</span>
          </label>

          <button
            className="btn-secondary ml-10"
            onClick={() => { setFilterRol(''); setSearchTerm(''); setIncludeInactivos(true); fetchUsuarios(); }}
            title="Mostrar todos"
          >
            Mostrar todos
          </button>

          <button
            className="btn-secondary ml-10"
            onClick={() => fetchUsuarios()}
            title="Refrescar"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="table-container" style={{ maxHeight: '480px', overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Contacto</th>
              <th>Rol</th>
              <th>Especialidad</th>
              <th>Horas Liberadas</th>
              <th>Horas Objetivo</th>
              <th>Fecha Registro</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.map((usuario) => {
              const rolInfo = getRolLabel(usuario.rol);

              return (
                <tr key={usuario.id}>
                  <td>
                    <div className="flex-row align-center gap-10">
                      <div className="avatar">
                        {(usuario.nombre && usuario.nombre[0]) || '?'}{(usuario.apellido && usuario.apellido[0]) || ''}
                      </div>
                      <div>
                        <div className="font-bold">{usuario.nombre || 'Sin nombre'} {usuario.apellido || ''}</div>
                        <div className="text-small">ID: {usuario.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{usuario.email}</div>
                    <div className="text-small">{usuario.telefono}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${usuario.activo ? rolInfo.color : 'danger'}`}>
                      {rolInfo.text}
                    </span>
                  </td>
                  <td>{usuario.especialidad}</td>
                  <td>
                    <div className="font-bold" style={{ color: 'var(--grnd)' }}>
                      {usuario.horas_liberadas !== undefined ? `${usuario.horas_liberadas}h` : '-'}
                    </div>
                  </td>
                  <td>
                    <div className="font-bold" style={{ color: 'var(--blu)' }}>
                      {usuario.horas_objetivo !== undefined ? `${usuario.horas_objetivo}h` : '-'}
                    </div>
                  </td>
                  <td>
                    {new Date(usuario.fecha_registro).toLocaleDateString()}
                  </td>
                  <td>
                    {usuario.activo ? (
                      <span className="badge badge-success">Activo</span>
                    ) : (
                      <span className="badge badge-danger">Inactivo</span>
                    )}
                  </td>
                  <td>
                    <div className="flex-row gap-5">
                      <button
                        className="btn-text text-info"
                        onClick={() => openStatsModal(usuario)}
                        title="Ver estadísticas"
                      >
                        <FiBarChart2 />
                      </button>
                      <button
                        className="btn-text"
                        onClick={() => editarUsuario(usuario)}
                        title="Editar"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className={`btn-text ${usuario.activo ? 'text-danger' : 'text-success'}`}
                        onClick={() => toggleEstadoUsuario(usuario.id)}
                        title={usuario.activo ? 'Desactivar' : 'Activar'}
                      >
                        {usuario.activo ? <FiXCircle /> : <FiCheckCircle />}
                      </button>
                      <button
                        className="btn-text text-danger"
                        onClick={() => deleteUsuario(usuario.id)}
                        title="Eliminar"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Resumen */}
      <div className="grid-3 mt-20">
        <div className="card">
          <h4>Resumen de Usuarios</h4>
          <div className="mt-10">
            <p>Total: {usuarios.length}</p>
            <p>Activos: {usuarios.filter(u => u.activo).length}</p>
            <p>Psicopedagógicos: {usuarios.filter(u => u.rol === 'psicopedagogico').length}</p>
            <p>Coterapeutas: {usuarios.filter(u => u.rol === 'coterapeuta').length}</p>
            <p>Terapeutas: {usuarios.filter(u => u.rol === 'terapeuta').length}</p>
          </div>
        </div>

        <div className="card">
          <h4>Distribución por Rol</h4>
          <div className="mt-10">
            {Object.entries(
              usuarios.reduce((acc, user) => {
                acc[user.rol] = (acc[user.rol] || 0) + 1;
                return acc;
              }, {})
            ).map(([rol, count]) => (
              <div key={rol} className="flex-row justify-between mb-5">
                <span>{getRolLabel(rol).text}:</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h4>Acciones</h4>
          <div className="mt-10 flex-col gap-10">
            <button className="btn-primary w-100" onClick={exportarListado}>
              Exportar Listado
            </button>
            <button
              className="btn-secondary w-100"
              onClick={() => {
                setShowRecordatorioModal(true);
                fetchRecordatorioConfig();
              }}
            >
              Enviar Recordatorios
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Usuario */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{modalType === 'nuevo' ? 'Nuevo Usuario' : 'Editar Usuario'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre || ''}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    value={formData.apellido || ''}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label>Rol</label>
                  <select
                    name="rol"
                    value={formData.rol || ''}
                    onChange={handleInputChange}
                    className="select-field"
                    required
                  >
                    <option value="coterapeuta">Coterapeuta</option>
                    <option value="terapeuta">Terapeuta</option>
                    <option value="psicopedagogico">Psicopedagógico</option>
                    <option value="coordinador">Coordinador</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Especialidad</label>
                  <input
                    type="text"
                    name="especialidad"
                    value={formData.especialidad || ''}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Ej: Terapia Cognitivo-Conductual"
                  />
                </div>

                {formData.rol === 'terapeuta' && modalType === 'nuevo' && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Contraseña Temporal</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input
                        type={showPassword ? 'text' : 'text'}
                        name="password"
                        value={formData.password}
                        className="input-field"
                        readOnly
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#666'
                        }}
                        title={showPassword ? 'Ocultar' : 'Mostrar'}
                      >
                        {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                      </button>
                    </div>
                    <p className="text-small mt-5">El usuario deberá cambiar la contraseña en su primer inicio</p>
                  </div>
                )}

                {modalType === 'editar' && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="flex-row align-center gap-10">
                      <input
                        type="checkbox"
                        name="cambiarPassword"
                        checked={formData.cambiarPassword}
                        onChange={handleInputChange}
                      />
                      <span>Cambiar contraseña</span>
                    </label>
                    {formData.cambiarPassword && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="Nueva contraseña"
                            value={formData.password}
                            onChange={handleInputChange}
                            className="input-field"
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#666'
                            }}
                            title={showPassword ? 'Ocultar' : 'Mostrar'}
                          >
                            {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="flex-row align-center gap-10">
                    <input
                      type="checkbox"
                      name="activo"
                      checked={formData.activo}
                      onChange={handleInputChange}
                    />
                    <span>Usuario activo</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-primary">
                  {modalType === 'nuevo' ? 'Crear Usuario' : 'Guardar Cambios'}
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Recordatorios */}
      {showRecordatorioModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Recordatorios de Citas</h3>
              <button className="modal-close" onClick={() => setShowRecordatorioModal(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="flex-row align-center gap-10">
                    <input
                      type="checkbox"
                      checked={recordatorioConfig.recordatorio_citas_activo}
                      onChange={(e) => setRecordatorioConfig(prev => ({
                        ...prev,
                        recordatorio_citas_activo: e.target.checked
                      }))}
                    />
                    <span>Recordatorio automático activo</span>
                  </label>
                </div>

                <div className="form-group">
                  <label>Frecuencia (días)</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={recordatorioConfig.recordatorio_citas_frecuencia_dias}
                    onChange={(e) => setRecordatorioConfig(prev => ({
                      ...prev,
                      recordatorio_citas_frecuencia_dias: Number(e.target.value)
                    }))}
                  />
                </div>

                <div className="form-group">
                  <label>Rango de citas (días)</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={recordatorioConfig.recordatorio_citas_rango_dias}
                    onChange={(e) => setRecordatorioConfig(prev => ({
                      ...prev,
                      recordatorio_citas_rango_dias: Number(e.target.value)
                    }))}
                  />
                </div>

                <div className="form-group">
                  <label>Hora de envío</label>
                  <input
                    type="time"
                    className="input-field"
                    value={recordatorioConfig.recordatorio_citas_hora}
                    onChange={(e) => setRecordatorioConfig(prev => ({
                      ...prev,
                      recordatorio_citas_hora: e.target.value
                    }))}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleEnviarRecordatorios}
                disabled={recordatorioLoading}
              >
                Enviar ahora
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleGuardarRecordatorioConfig}
                disabled={recordatorioLoading}
              >
                Guardar configuración
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => setShowRecordatorioModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estadísticas */}
      {showStatsModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '800px', width: '95%' }}>
            <div className="modal-header">
              <h3>Estadísticas de Usuario</h3>
              <button className="modal-close" onClick={closeStatsModal}>×</button>
            </div>

            <div className="modal-content">
              {statsLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <div className="loading-text">Cargando estadísticas...</div>
                </div>
              ) : statsData ? (
                <div>
                  <div className="mb-20">
                    <h4>{statsData.usuario.nombre} {statsData.usuario.apellido}</h4>
                    <p className="text-small">{statsData.usuario.rol} - {statsData.usuario.email}</p>
                  </div>

                  {/* Grid de estadísticas principales */}
                  <div className="grid-3 mb-20">
                    <div className="card">
                      <div className="text-small">Tasa de Completitud</div>
                      <div className="font-bold" style={{ fontSize: '24px', color: '#28a745' }}>
                        {statsData.estadisticas.tasa_completitud}%
                      </div>
                      <div className="text-small">{statsData.estadisticas.citas_completadas} completadas</div>
                    </div>
                    <div className="card">
                      <div className="text-small">Tasa de Cancelación</div>
                      <div className="font-bold" style={{ fontSize: '24px', color: '#dc3545' }}>
                        {statsData.estadisticas.tasa_cancelacion}%
                      </div>
                      <div className="text-small">{statsData.estadisticas.citas_canceladas} canceladas</div>
                    </div>
                    <div className="card">
                      <div className="text-small">Tasa de Pendientes</div>
                      <div className="font-bold" style={{ fontSize: '24px', color: '#fd7e14' }}>
                        {statsData.estadisticas.tasa_pendientes}%
                      </div>
                      <div className="text-small">{statsData.estadisticas.citas_pendientes} pendientes</div>
                    </div>
                  </div>

                  {/* Grid de información adicional */}
                  <div className="grid-2 mb-20">
                    <div className="card">
                      <div className="text-small">Citas Vencidas</div>
                      <div className="font-bold" style={{ fontSize: '20px', color: 'var(--danger)' }}>
                        {statsData.estadisticas.citas_vencidas}
                      </div>
                      <div className="text-small">Citas pendientes no marcadas como completadas</div>
                    </div>
                    <div className="card">
                      <div className="text-small">Total de Citas</div>
                      <div className="font-bold" style={{ fontSize: '20px' }}>
                        {statsData.estadisticas.total_citas}
                      </div>
                      <div className="text-small">En el mes actual</div>
                    </div>
                  </div>

                  {/* Horas */}
                  <div className="card mb-20">
                    <h5>Progreso de Horas</h5>
                    <div className="flex-row justify-between align-center mt-10">
                      <div>
                        <div className="text-small">Horas Liberadas</div>
                        <div className="font-bold" style={{ fontSize: '20px', color: 'var(--grnd)' }}>
                          {statsData.estadisticas.horas_liberadas}h
                        </div>
                      </div>
                      <div>
                        <div className="text-small">Horas Objetivo</div>
                        <div className="font-bold" style={{ fontSize: '20px', color: 'var(--blu)' }}>
                          {statsData.estadisticas.horas_objetivo}h
                        </div>
                      </div>
                      <div>
                        <div className="text-small">Porcentaje</div>
                        <div className="font-bold" style={{ fontSize: '20px' }}>
                          {statsData.estadisticas.horas_objetivo > 0
                            ? Math.round((statsData.estadisticas.horas_liberadas / statsData.estadisticas.horas_objetivo) * 100)
                            : 0}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pacientes asignados */}
                  <div className="card mb-20">
                    <h5>Pacientes Asignados ({statsData.pacientes_asignados.length})</h5>
                    {statsData.pacientes_asignados.length > 0 ? (
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="mt-10">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Nombre</th>
                              <th>Género</th>
                              <th>Edad</th>
                              <th>Fecha Asignación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {statsData.pacientes_asignados.map(p => (
                              <tr key={p.paciente_id}>
                                <td>{p.nombre} {p.apellido}</td>
                                <td>{p.genero}</td>
                                <td>{p.edad || '-'}</td>
                                <td>{new Date(p.fecha_asignacion).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-small mt-10">No hay pacientes asignados</p>
                    )}
                  </div>

                  {/* Disponibilidad */}
                  {statsData.disponibilidad && statsData.disponibilidad.length > 0 && (
                    <div className="card mb-20">
                      <h5>Disponibilidad Horaria</h5>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="mt-10">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Día</th>
                              <th>Horario</th>
                              <th>Tipo</th>
                              <th>Max Citas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {statsData.disponibilidad.map((d, i) => (
                              <tr key={i}>
                                <td style={{ textTransform: 'capitalize' }}>{d.dia}</td>
                                <td>{d.hora_inicio.substring(0, 5)} - {d.hora_fin.substring(0, 5)}</td>
                                <td>
                                  <span className={`badge badge-${d.tipo === 'regular' ? 'success' : d.tipo === 'extraordinaria' ? 'info' : 'warning'}`}>
                                    {d.tipo}
                                  </span>
                                </td>
                                <td>{d.max_citas}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Motivos de cancelación */}
                  {statsData.motivos_cancelacion.length > 0 && (
                    <div className="card">
                      <h5>Principales Motivos de Cancelación</h5>
                      <div className="mt-10">
                        {statsData.motivos_cancelacion.slice(0, 5).map((m, i) => (
                          <div key={i} className="flex-row justify-between mb-5">
                            <span>{m.motivo}</span>
                            <span className="badge badge-danger">{m.cantidad}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p>No se pudieron cargar las estadísticas</p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeStatsModal}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinadorUsuarios;