import { useState, useEffect } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Pencil, Trash2, TrendingUp, Landmark, X, PieChart } from 'lucide-react';
import './App.css'; // ← Asegúrate de importar el CSS mejorado

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TRADES_URL = `${API_BASE}/api/trades`;
const CASHFLOW_URL = `${API_BASE}/api/cashflow`;

// Función para formatear fechas ignorando la zona horaria
const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

function App() {
  // ==========================================
  // ⚙️ TODOS LOS ESTADOS (REACT HOOKS)
  // ==========================================
  const [activeTab, setActiveTab] = useState('trades');
  const [trades, setTrades] = useState([]);
  const [cashflows, setCashflows] = useState([]);
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [editingCashId, setEditingCashId] = useState(null);

  // Estados de notificaciones y modales
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, type: null });
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Estados para los filtros
  const [tradeSearch, setTradeSearch] = useState('');
  const [tradeTypeFilter, setTradeTypeFilter] = useState('TODOS');
  const [cashSearch, setCashSearch] = useState('');
  const [cashTypeFilter, setCashTypeFilter] = useState('TODOS');

  // Formularios
  const [tradeForm, setTradeForm] = useState({
    type: 'COMPRA',
    ticker: '',
    assetName: '',
    amountValue: '',
    tradeDate: new Date().toISOString().split('T')[0],
    imageUrl: ''
  });

  const [cashForm, setCashForm] = useState({
    type: 'DEPOSITO',
    amountValue: '',
    date: new Date().toISOString().split('T')[0],
    method: 'Transferencia',
    ticker: ''
  });

  // ===== BUSCAR ABREVIATURA Y AUTOCOMPLETADO ==========
  const uniqueAssets = trades.reduce((acc, current) => {
    const exists = acc.find(item => item.ticker.toUpperCase() === current.ticker.toUpperCase());
    if (!exists && current.ticker) {
      return acc.concat([current]);
    }
    return acc;
  }, []);

  const filteredAssets = uniqueAssets.filter(asset =>
    asset.ticker.toLowerCase().includes(tradeForm.ticker.toLowerCase()) ||
    asset.assetName.toLowerCase().includes(tradeForm.ticker.toLowerCase())
  );

  const handleSelectAsset = (asset) => {
    setTradeForm({
      ...tradeForm,
      ticker: asset.ticker.toUpperCase(),
      assetName: asset.assetName,
      imageUrl: asset.imageUrl || ''
    });
    setShowSuggestions(false);
  };

  // 🟢 FILTRADO: Operaciones de Trading
  const filteredTradesList = trades.filter(trade => {
    const matchesSearch = 
      trade.ticker.toLowerCase().includes(tradeSearch.toLowerCase()) ||
      trade.assetName.toLowerCase().includes(tradeSearch.toLowerCase());
    
    const matchesType = tradeTypeFilter === 'TODOS' || trade.type === tradeTypeFilter;
    return matchesSearch && matchesType;
  });

  // 🟢 FILTRADO: Movimientos de Caja
  const filteredCashflowsList = cashflows.filter(cash => {
    const methodMatch = cash.method ? cash.method.toLowerCase().includes(cashSearch.toLowerCase()) : false;
    const tickerMatch = cash.ticker ? cash.ticker.toLowerCase().includes(cashSearch.toLowerCase()) : false;
    const matchesSearch = cashSearch === '' || methodMatch || tickerMatch;
    
    const matchesType = cashTypeFilter === 'TODOS' || cash.type === cashTypeFilter;
    return matchesSearch && matchesType;
  });

  // Carga inicial de datos
  useEffect(() => {
    fetchTrades();
    fetchCashflows();
  }, []);

  // ==========================================
  // 🔔 LÓGICA DE TOAST Y MODAL DE ELIMINACIÓN
  // ==========================================
  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const openDeleteModal = (id, type) => {
    setDeleteModal({ show: true, id, type });
  };

  const executeDelete = async () => {
    const { id, type } = deleteModal;
    if (!id || !type) return;

    try {
      const url = type === 'trade' ? `${TRADES_URL}/${id}` : `${CASHFLOW_URL}/${id}`;
      const response = await fetch(url, { method: 'DELETE' });

      if (response.ok) {
        if (type === 'trade') {
          fetchTrades();
          if (editingTradeId === id) cancelTradeEdit();
          triggerToast('Operación de trading eliminada', 'danger');
        } else {
          fetchCashflows();
          if (editingCashId === id) cancelCashEdit();
          triggerToast('Movimiento de caja eliminado', 'danger');
        }
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error al eliminar', 'danger');
    } finally {
      setDeleteModal({ show: false, id: null, type: null });
    }
  };

  // ==========================================
  // 📊 FUNCIONES PARA TRADES
  // ==========================================
  const fetchTrades = async () => {
    try {
      const response = await fetch(TRADES_URL);
      if (response.ok) setTrades(await response.json());
    } catch (e) { console.error('Error cargando trades:', e); }
  };

  const handleTradeSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingTradeId ? `${TRADES_URL}/${editingTradeId}` : TRADES_URL;
      const method = editingTradeId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeForm)
      });
      if (response.ok) {
        fetchTrades();
        cancelTradeEdit();
        triggerToast(editingTradeId ? 'Operación actualizada' : 'Operación guardada', 'success');
      }
    } catch (e) { console.error(e); }
  };

  const startTradeEdit = (trade) => {
    setEditingTradeId(trade.id);
    setTradeForm({
      type: trade.type,
      ticker: trade.ticker,
      assetName: trade.assetName,
      amountValue: trade.amountValue,
      tradeDate: new Date(trade.tradeDate).toISOString().split('T')[0],
      imageUrl: trade.imageUrl || ''
    });
  };

  const cancelTradeEdit = () => {
    setEditingTradeId(null);
    setTradeForm({ 
      type: 'COMPRA', 
      ticker: '', 
      assetName: '', 
      amountValue: '', 
      tradeDate: new Date().toISOString().split('T')[0], 
      imageUrl: ''
    });
  };

  // ==========================================
  // 💰 FUNCIONES PARA CASHFLOW
  // ==========================================
  const fetchCashflows = async () => {
    try {
      const response = await fetch(CASHFLOW_URL);
      if (response.ok) setCashflows(await response.json());
    } catch (e) { console.error('Error cargando caja:', e); }
  };

  const handleCashSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingCashId ? `${CASHFLOW_URL}/${editingCashId}` : CASHFLOW_URL;
      const method = editingCashId ? 'PUT' : 'POST';
      
      const payload = {
        ...cashForm,
        ticker: cashForm.ticker.trim() !== '' ? cashForm.ticker.toUpperCase() : null
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        fetchCashflows();
        cancelCashEdit();
        triggerToast(editingCashId ? 'Movimiento actualizado' : 'Movimiento registrado', 'success');
      }
    } catch (e) { console.error(e); }
  };

  const startCashEdit = (cash) => {
    setEditingCashId(cash.id);
    setCashForm({
      type: cash.type,
      amountValue: cash.amountValue,
      date: new Date(cash.date).toISOString().split('T')[0],
      method: cash.method || 'Transferencia',
      ticker: cash.ticker || ''
    });
  };

  const cancelCashEdit = () => {
    setEditingCashId(null);
    setCashForm({ 
      type: 'DEPOSITO', 
      amountValue: '', 
      date: new Date().toISOString().split('T')[0], 
      method: 'Transferencia',
      ticker: ''
    });
  };

  // ===== RENDIMIENTO POR ACTIVO =====
  const performanceByAsset = trades.reduce((acc, trade) => {
    const ticker = trade.ticker.toUpperCase();
    if (!acc[ticker]) {
      acc[ticker] = { ticker, assetName: trade.assetName, compras: 0, ventas: 0, dividendos: 0 };
    }
    
    if (trade.type === 'COMPRA') {
      acc[ticker].compras += Number(trade.amountValue);
    } else if (trade.type === 'VENTA') {
      acc[ticker].ventas += Number(trade.amountValue);
    }
    
    return acc;
  }, {});

  cashflows.forEach(cash => {
    if (cash.type === 'DIVIDENDO' && cash.ticker) {
      const ticker = cash.ticker.toUpperCase();
      if (performanceByAsset[ticker]) {
        performanceByAsset[ticker].dividendos += Number(cash.amountValue);
      } else {
        performanceByAsset[ticker] = { 
          ticker, 
          assetName: 'Activo de Caja', 
          compras: 0, 
          ventas: 0, 
          dividendos: Number(cash.amountValue) 
        };
      }
    }
  });

  const performanceList = Object.values(performanceByAsset);

  return (
    <div className="app-viewport">
      <div className="app-container">
        
        {/* Header Principal */}
        <header className="app-header">
          <Wallet className="icon-blue" size={32} />
          <h1>Hapi Tracker</h1>
        </header>

        {/* Selector de Pestañas */}
        <nav className="tabs-container">
          <button 
            className={`tab-button ${activeTab === 'trades' ? 'active' : ''}`}
            onClick={() => setActiveTab('trades')}
          >
            <TrendingUp size={18} /> <span className="tab-label">Operaciones</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'cashflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('cashflow')}
          >
            <Landmark size={18} /> <span className="tab-label">Flujo de Caja</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            <PieChart size={18} /> <span className="tab-label">Rendimiento</span>
          </button>
        </nav>

        {/* PESTAÑA TRADES */}
        {activeTab === 'trades' && (
          <div className="main-grid">
            {/* Formulario Trades */}
            <section className={`card ${editingTradeId ? 'editing-mode' : ''}`}>
              <h2>{editingTradeId ? '⚡ Editar Operación' : 'Nueva Operación'}</h2>
              <form onSubmit={handleTradeSubmit}>
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={tradeForm.type} onChange={(e) => setTradeForm({...tradeForm, type: e.target.value})} className="form-control">
                    <option value="COMPRA">Compra</option>
                    <option value="VENTA">Venta</option>
                  </select>
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Ticker / Abreviatura</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej: AAPL, BTC" 
                    value={tradeForm.ticker} 
                    onChange={(e) => setTradeForm({...tradeForm, ticker: e.target.value})} 
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="form-control uppercase" 
                  />

                  {showSuggestions && tradeForm.ticker && filteredAssets.length > 0 && (
                    <ul className="suggestions-dropdown">
                      {filteredAssets.map((asset) => (
                        <li key={asset.id} onMouseDown={() => handleSelectAsset(asset)}>
                          {asset.imageUrl ? (
                            <img src={asset.imageUrl} alt={asset.ticker} className="suggestion-logo" />
                          ) : (
                            <div className="suggestion-logo-placeholder">
                              {asset.ticker.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="suggestion-info">
                            <span className="suggestion-ticker">{asset.ticker}</span>
                            <span className="suggestion-name">{asset.assetName}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="form-group">
                  <label>Nombre del Activo</label>
                  <input type="text" required placeholder="Ej: Apple, Bitcoin" value={tradeForm.assetName} onChange={(e) => setTradeForm({...tradeForm, assetName: e.target.value})} className="form-control" />
                </div>
                <div className="form-group">
                  <label>URL del Logo (Opcional)</label>
                  <input type="url" placeholder="Ej: https://cryptologos.cc/logos/bitcoin-btc-logo.png" value={tradeForm.imageUrl} onChange={(e) => setTradeForm({...tradeForm, imageUrl: e.target.value})} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Valor ($)</label>
                  <input type="number" step="0.01" required placeholder="0.00" value={tradeForm.amountValue} onChange={(e) => setTradeForm({...tradeForm, amountValue: e.target.value})} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" required value={tradeForm.tradeDate} onChange={(e) => setTradeForm({...tradeForm, tradeDate: e.target.value})} className="form-control" />
                </div>
                <div className="btn-group">
                  <button type="submit" className={`btn ${editingTradeId ? 'btn-amber' : 'btn-primary'}`}>{editingTradeId ? 'Actualizar' : 'Guardar'}</button>
                  {editingTradeId && <button type="button" onClick={cancelTradeEdit} className="btn btn-cancel">Cancelar</button>}
                </div>
              </form>
            </section>

            {/* Historial Trades */}
            <section className="card">
              <h2>Historial de Operaciones</h2>

              <div className="filter-bar">
                <div className="search-wrapper">
                  <input 
                    type="text" 
                    placeholder="Buscar por Ticker o nombre..." 
                    value={tradeSearch}
                    onChange={(e) => setTradeSearch(e.target.value)}
                    className="form-control filter-input"
                  />
                  {tradeSearch && (
                    <button type="button" className="clear-search-btn" onClick={() => setTradeSearch('')}>
                      <X size={16} />
                    </button>
                  )}
                </div>

                <select value={tradeTypeFilter} onChange={(e) => setTradeTypeFilter(e.target.value)} className="form-control filter-select">
                  <option value="TODOS">Todos los tipos</option>
                  <option value="COMPRA">Compras</option>
                  <option value="VENTA">Ventas</option>
                </select>
              </div>

              {filteredTradesList.length === 0 ? (
                <p className="empty-state">No se encontraron operaciones con los filtros aplicados.</p>
              ) : (
                <div className="table-responsive">
                  <table className="trade-table">
                    <thead>
                      <tr><th>Tipo</th><th>Activo</th><th>Valor</th><th>Fecha</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {filteredTradesList.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <div className={`cell-type ${t.type === 'COMPRA' ? 'compra' : 'venta'}`}>
                              {t.type === 'COMPRA' ? <ArrowDownCircle className="icon-success" size={16} /> : <ArrowUpCircle className="icon-danger" size={16} />}
                              <span>{t.type}</span>
                            </div>
                          </td>
                          <td>
                            <div className="asset-cell-wrapper">
                              {t.imageUrl ? (
                                <img src={t.imageUrl} alt={t.ticker} className="asset-logo" onError={(e) => { e.target.style.display = 'none'; }} />
                              ) : (
                                <div className="asset-logo-placeholder">
                                  {t.ticker.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="asset-ticker">{t.ticker}</p>
                                <p className="asset-name">{t.assetName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="cell-value">${Number(t.amountValue).toFixed(2)}</td>
                          <td className="cell-date">{formatDate(t.tradeDate)}</td>
                          <td className="actions-cell">
                            <button onClick={() => startTradeEdit(t)} className="action-btn edit-btn"><Pencil size={16} /></button>
                            <button onClick={() => openDeleteModal(t.id, 'trade')} className="action-btn delete-btn"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* PESTAÑA CASHFLOW */}
        {activeTab === 'cashflow' && (
          <div className="main-grid">
            {/* Formulario Caja */}
            <section className={`card ${editingCashId ? 'editing-mode' : ''}`}>
              <h2>{editingCashId ? '⚡ Editar Movimiento' : 'Nuevo Movimiento'}</h2>
              <form onSubmit={handleCashSubmit}>
                <div className="form-group">
                  <label>Tipo de Flujo</label>
                  <select 
                    value={cashForm.type} 
                    onChange={(e) => setCashForm({...cashForm, type: e.target.value, ticker: e.target.value !== 'DIVIDENDO' ? '' : cashForm.ticker})} 
                    className="form-control"
                  >
                    <option value="DEPOSITO">Depósito (+)</option>
                    <option value="RETIRO">Retiro (-)</option>
                    <option value="DIVIDENDO">Dividendo (+)</option>
                  </select>
                </div>

                {cashForm.type === 'DIVIDENDO' && (
                  <div className="form-group">
                    <label>Ticker / Acción <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>(Opcional)</span></label>
                    <input 
                      type="text" 
                      placeholder="Ej: AAPL, O" 
                      value={cashForm.ticker} 
                      onChange={(e) => setCashForm({...cashForm, ticker: e.target.value})} 
                      className="form-control uppercase"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Monto ($)</label>
                  <input type="number" step="0.01" required placeholder="0.00" value={cashForm.amountValue} onChange={(e) => setCashForm({...cashForm, amountValue: e.target.value})} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Detalle / Plataforma</label>
                  <input type="text" placeholder="Ej: Transferencia, Tarjeta, Binance" value={cashForm.method} onChange={(e) => setCashForm({...cashForm, method: e.target.value})} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" required value={cashForm.date} onChange={(e) => setCashForm({...cashForm, date: e.target.value})} className="form-control" />
                </div>
                <div className="btn-group">
                  <button type="submit" className={`btn ${editingCashId ? 'btn-amber' : 'btn-primary'}`}>{editingCashId ? 'Actualizar' : 'Registrar'}</button>
                  {editingCashId && <button type="button" onClick={cancelCashEdit} className="btn btn-cancel">Cancelar</button>}
                </div>
              </form>
            </section>

            {/* Historial Caja */}
            <section className="card">
              <h2>Movimientos de Efectivo</h2>

              <div className="filter-bar">
                <div className="search-wrapper">
                  <input 
                    type="text" 
                    placeholder="Buscar por método o Ticker..." 
                    value={cashSearch}
                    onChange={(e) => setCashSearch(e.target.value)}
                    className="form-control filter-input"
                  />
                  {cashSearch && (
                    <button type="button" className="clear-search-btn" onClick={() => setCashSearch('')}>
                      <X size={16} />
                    </button>
                  )}
                </div>

                <select value={cashTypeFilter} onChange={(e) => setCashTypeFilter(e.target.value)} className="form-control filter-select">
                  <option value="TODOS">Todos los flujos</option>
                  <option value="DEPOSITO">Depósitos (+)</option>
                  <option value="RETIRO">Retiros (-)</option>
                  <option value="DIVIDENDO">Dividendos (+)</option>
                </select>
              </div>

              {filteredCashflowsList.length === 0 ? (
                <p className="empty-state">No se encontraron movimientos con los filtros aplicados.</p>
              ) : (
                <div className="table-responsive">
                  <table className="trade-table">
                    <thead>
                      <tr><th>Tipo</th><th>Detalle / Origen</th><th>Monto</th><th>Fecha</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {filteredCashflowsList.map((c) => {
                        let typeClass = 'compra';
                        if (c.type === 'RETIRO') typeClass = 'venta';
                        if (c.type === 'DIVIDENDO') typeClass = 'dividendo';

                        let valueColor = 'var(--success)';
                        if (c.type === 'RETIRO') valueColor = 'var(--danger)';
                        if (c.type === 'DIVIDENDO') valueColor = 'var(--amber)';

                        return (
                          <tr key={c.id}>
                            <td>
                              <div className={`cell-type ${typeClass}`}>
                                {c.type === 'RETIRO' ? (
                                  <ArrowUpCircle className="icon-danger" size={16} />
                                ) : (
                                  <ArrowDownCircle 
                                    className={c.type === 'DIVIDENDO' ? 'icon-amber' : 'icon-success'} 
                                    size={16} 
                                  />
                                )}
                                <span>{c.type}</span>
                              </div>
                            </td>
                            <td>
                              <p className="asset-ticker">
                                {c.type === 'DIVIDENDO' && c.ticker ? (
                                  <span style={{ color: 'var(--amber)', fontWeight: 'bold' }}>[{c.ticker}] </span>
                                ) : null}
                                {c.method || 'Transferencia'}
                              </p>
                            </td>
                            <td className="cell-value" style={{ color: valueColor }}>
                              {c.type === 'RETIRO' ? '-' : '+'}${Number(c.amountValue).toFixed(2)}
                            </td>
                            <td className="cell-date">{formatDate(c.date)}</td>
                            <td className="actions-cell">
                              <button onClick={() => startCashEdit(c)} className="action-btn edit-btn"><Pencil size={16} /></button>
                              <button onClick={() => openDeleteModal(c.id, 'cashflow')} className="action-btn delete-btn"><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* PESTAÑA RENDIMIENTO */}
        {activeTab === 'performance' && (
          <div className="card full-width-card">
            <h2>Rendimiento Realizado por Activo</h2>
            <p className="subtitle">Cálculo basado en tus compras, ventas y dividendos registrados.</p>

            {performanceList.length === 0 ? (
              <p className="empty-state">Registra operaciones para calcular tu rendimiento.</p>
            ) : (
              <div className="table-responsive">
                <table className="trade-table">
                  <thead>
                    <tr>
                      <th>Activo</th>
                      <th>Total Compras</th>
                      <th>Total Ventas</th>
                      <th>Dividendos</th>
                      <th>Resultado Neto (P&L)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceList.map((asset) => {
                      const totalGainLoss = (asset.ventas + asset.dividendos) - asset.compras;
                      const isProfit = totalGainLoss >= 0;

                      return (
                        <tr key={asset.ticker}>
                          <td>
                            <p className="asset-ticker">{asset.ticker}</p>
                            <p className="asset-name">{asset.assetName}</p>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>${asset.compras.toFixed(2)}</td>
                          <td style={{ color: 'var(--text-muted)' }}>${asset.ventas.toFixed(2)}</td>
                          <td style={{ color: 'var(--amber)', fontWeight: asset.dividendos > 0 ? 'bold' : 'normal' }}>
                            ${asset.dividendos.toFixed(2)}
                          </td>
                          <td style={{ 
                            color: isProfit ? 'var(--success)' : 'var(--danger)', 
                            fontWeight: 'bold',
                            backgroundColor: isProfit ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                          }}>
                            {isProfit ? '+' : ''}${totalGainLoss.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🛑 MODAL DE CONFIRMACIÓN */}
      {deleteModal.show && (
        <div className="modal-overlay">
          <div className="custom-modal">
            <h2>⚠️ ¿Confirmar eliminación?</h2>
            <p>Esta acción es definitiva. El registro se borrará permanentemente de tu base de datos en Railway y no se podrá recuperar.</p>
            <div className="modal-actions">
              <button onClick={executeDelete} className="btn-modal-danger">Eliminar</button>
              <button onClick={() => setDeleteModal({ show: false, id: null, type: null })} className="btn btn-cancel">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* COMPONENTE TOAST FLOTANTE */}
      {toast.show && (
        <div className={`custom-toast toast-${toast.type}`}>
          <div className="toast-content">
            <span className="toast-bullet"></span>
            <p>{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;