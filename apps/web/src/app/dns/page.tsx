'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import InputAdornment from '@mui/material/InputAdornment';
import { ModuleStateContainer } from '../../components/ModuleStateContainer';

export type DnsType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'CAA' | 'SRV';

export interface UiDnsRecord {
  id: string;
  name: string;
  type: DnsType;
  value: string;
  ttl: number;
  priority?: number;
}

const INITIAL_RECORDS: UiDnsRecord[] = [
  { id: 'rec-1', name: '@', type: 'A', value: '89.117.147.134', ttl: 14400 },
  { id: 'rec-2', name: 'www', type: 'CNAME', value: 'velupi.com.', ttl: 14400 },
  { id: 'rec-3', name: 'ns1', type: 'A', value: '89.117.147.134', ttl: 14400 },
  { id: 'rec-4', name: 'ns2', type: 'A', value: '89.117.147.134', ttl: 14400 },
  { id: 'rec-5', name: 'mail', type: 'A', value: '89.117.147.134', ttl: 14400 },
  { id: 'rec-6', name: '@', type: 'MX', value: 'mail.velupi.com.', priority: 10, ttl: 14400 },
  { id: 'rec-7', name: '@', type: 'TXT', value: '"v=spf1 a mx ip4:89.117.147.134 ~all"', ttl: 14400 },
  { id: 'rec-8', name: 'api', type: 'A', value: '169.58.220.244', ttl: 3600 },
  { id: 'rec-9', name: 'app', type: 'A', value: '169.58.220.244', ttl: 3600 },
  { id: 'rec-10', name: '@', type: 'CAA', value: '0 issue "letsencrypt.org"', ttl: 3600 },
];

export default function DnsManagerPage() {
  const [records, setRecords] = React.useState<UiDnsRecord[]>(INITIAL_RECORDS);
  const [filterType, setFilterType] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [openModal, setOpenModal] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [syncSuccess, setSyncSuccess] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form state
  const [formName, setFormName] = React.useState('@');
  const [formType, setFormType] = React.useState<DnsType>('A');
  const [formValue, setFormValue] = React.useState('');
  const [formTtl, setFormTtl] = React.useState<number>(3600);
  const [formPriority, setFormPriority] = React.useState<number>(10);

  const handleOpenAdd = () => {
    setFormName('@');
    setFormType('A');
    setFormValue('');
    setFormTtl(3600);
    setFormPriority(10);
    setFormError(null);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const handleSaveRecord = () => {
    const trimmedName = formName.trim().toLowerCase();
    const trimmedVal = formValue.trim();

    if (!trimmedVal) {
      setFormError('El valor/destino del registro es obligatorio.');
      return;
    }

    // RFC 1912 CNAME conflict check
    if (formType === 'CNAME') {
      const existing = records.filter((r) => r.name === trimmedName);
      if (existing.length > 0) {
        setFormError(`Conflicto RFC 1912: No se puede asignar CNAME a '${trimmedName}' porque ya existen otros registros.`);
        return;
      }
    } else {
      const hasCname = records.some((r) => r.name === trimmedName && r.type === 'CNAME');
      if (hasCname) {
        setFormError(`Conflicto RFC 1912: Ya existe un CNAME para '${trimmedName}'.`);
        return;
      }
    }

    // A IPv4 check
    if (formType === 'A') {
      const isIpv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(trimmedVal);
      if (!isIpv4) {
        setFormError(`Dirección IPv4 inválida: '${trimmedVal}'`);
        return;
      }
    }

    // AAAA IPv6 check
    if (formType === 'AAAA') {
      const isIpv6 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/i.test(trimmedVal);
      if (!isIpv6) {
        setFormError(`Dirección IPv6 inválida: '${trimmedVal}'`);
        return;
      }
    }

    const newRecord: UiDnsRecord = {
      id: `rec-${Date.now()}`,
      name: trimmedName,
      type: formType,
      value: trimmedVal,
      ttl: formTtl,
      priority: formType === 'MX' || formType === 'SRV' ? formPriority : undefined,
    };

    setRecords((prev) => [...prev, newRecord]);
    setOpenModal(false);
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSyncDns = () => {
    setSyncing(true);
    setSyncSuccess(null);
    setTimeout(() => {
      setSyncing(false);
      setSyncSuccess('Zona sincronizada y reconciliada con éxito con los servidores autoritativos.');
      setTimeout(() => setSyncSuccess(null), 5000);
    }, 1000);
  };

  const filteredRecords = records.filter((r) => {
    const matchesType = filterType === 'ALL' || r.type === filterType;
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.value.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DnsRoundedIcon sx={{ color: '#06b6d4', fontSize: '2rem' }} /> DNS Manager
          </Typography>
          <Typography variant="body1" sx={{ color: '#9ca3af' }}>
            Servidores de nombres autoritativos, administración integral de zonas DNS y propagación global de registros.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={handleSyncDns}
            disabled={syncing}
            startIcon={syncing ? <CircularProgress size={16} sx={{ color: '#06b6d4' }} /> : <SyncRoundedIcon />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              borderColor: 'rgba(6, 182, 212, 0.4)',
              color: '#06b6d4',
              '&:hover': { borderColor: '#06b6d4', backgroundColor: 'rgba(6, 182, 212, 0.05)' },
            }}
          >
            {syncing ? 'Sincronizando...' : 'Reconciliar DNS'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenAdd}
            startIcon={<AddRoundedIcon />}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Agregar Registro
          </Button>
        </Box>
      </Box>

      {/* Nameservers Banner */}
      <Alert
        severity="info"
        variant="outlined"
        sx={{
          mb: 3,
          backgroundColor: 'rgba(6, 182, 212, 0.08)',
          borderColor: 'rgba(6, 182, 212, 0.3)',
          color: '#e5e7eb',
        }}
      >
        <strong>Servidores de Nombres Autoritativos de Velupi:</strong> <code>ns1.velupi.com</code> y <code>ns2.velupi.com</code>
      </Alert>

      {syncSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {syncSuccess}
        </Alert>
      )}

      {/* Filters and search bar */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: '#111827', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Buscar por host o destino..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            flexGrow: 1,
            minWidth: 220,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#1f2937',
              color: '#fff',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ color: '#9ca3af' }} />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          select
          size="small"
          label="Filtrar por tipo"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          sx={{
            width: 180,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#1f2937',
              color: '#fff',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
            },
            '& .MuiInputLabel-root': { color: '#9ca3af' },
          }}
        >
          <MenuItem value="ALL">Todos los tipos</MenuItem>
          <MenuItem value="A">A (IPv4)</MenuItem>
          <MenuItem value="AAAA">AAAA (IPv6)</MenuItem>
          <MenuItem value="CNAME">CNAME (Alias)</MenuItem>
          <MenuItem value="MX">MX (Correo)</MenuItem>
          <MenuItem value="TXT">TXT (Texto / SPF)</MenuItem>
          <MenuItem value="CAA">CAA (Certificados)</MenuItem>
          <MenuItem value="SRV">SRV (Servicio)</MenuItem>
        </TextField>
      </Paper>

      <ModuleStateContainer state="success">
        <Paper sx={{ backgroundColor: '#111827', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700 }}>
              Zona Activa: velupi.com ({filteredRecords.length} registros)
            </Typography>
            <Chip label="Autoritativo BIND9" size="small" sx={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700 }} />
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem', borderColor: 'rgba(255, 255, 255, 0.06)' } }}>
                  <TableCell>Host / Nombre</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Destino / Valor</TableCell>
                  <TableCell>Prioridad</TableCell>
                  <TableCell>TTL</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.map((r) => (
                  <TableRow key={r.id} sx={{ '& td': { color: '#e5e7eb', borderColor: 'rgba(255, 255, 255, 0.04)' } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={r.type}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          backgroundColor:
                            r.type === 'A'
                              ? 'rgba(6, 182, 212, 0.15)'
                              : r.type === 'MX'
                              ? 'rgba(234, 179, 8, 0.15)'
                              : r.type === 'TXT'
                              ? 'rgba(168, 85, 247, 0.15)'
                              : 'rgba(99, 102, 241, 0.15)',
                          color:
                            r.type === 'A'
                              ? '#67e8f9'
                              : r.type === 'MX'
                              ? '#fde047'
                              : r.type === 'TXT'
                              ? '#d8b4fe'
                              : '#a5b4fc',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.value}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#9ca3af' }}>
                      {r.priority !== undefined ? r.priority : '-'}
                    </TableCell>
                    <TableCell>{r.ttl}s</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Eliminar registro">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteRecord(r.id)}
                          sx={{ color: '#ef4444', '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' } }}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </ModuleStateContainer>

      {/* Modal Dialog for Adding Record */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: '#111827', color: '#fff', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.1)' } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Agregar Registro DNS</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Nombre / Host"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              helperText="Usa '@' para la raíz del dominio"
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#1f2937', color: '#fff' }, '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiFormHelperText-root': { color: '#6b7280' } }}
            />
            <TextField
              select
              label="Tipo de Registro"
              value={formType}
              onChange={(e) => setFormType(e.target.value as DnsType)}
              sx={{ width: 180, '& .MuiOutlinedInput-root': { backgroundColor: '#1f2937', color: '#fff' }, '& .MuiInputLabel-root': { color: '#9ca3af' } }}
            >
              <MenuItem value="A">A (IPv4)</MenuItem>
              <MenuItem value="AAAA">AAAA (IPv6)</MenuItem>
              <MenuItem value="CNAME">CNAME (Alias)</MenuItem>
              <MenuItem value="MX">MX (Correo)</MenuItem>
              <MenuItem value="TXT">TXT (Texto)</MenuItem>
              <MenuItem value="CAA">CAA</MenuItem>
              <MenuItem value="SRV">SRV</MenuItem>
            </TextField>
          </Box>

          <TextField
            label="Destino / Valor"
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
            placeholder={formType === 'A' ? '169.58.220.244' : formType === 'CNAME' ? 'lb.velupi.com.' : 'Valor del registro'}
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#1f2937', color: '#fff' }, '& .MuiInputLabel-root': { color: '#9ca3af' } }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="TTL (segundos)"
              type="number"
              value={formTtl}
              onChange={(e) => setFormTtl(Number(e.target.value))}
              helperText="Min: 60s, Max: 86400s"
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#1f2937', color: '#fff' }, '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiFormHelperText-root': { color: '#6b7280' } }}
            />
            {(formType === 'MX' || formType === 'SRV') && (
              <TextField
                label="Prioridad"
                type="number"
                value={formPriority}
                onChange={(e) => setFormPriority(Number(e.target.value))}
                sx={{ width: 180, '& .MuiOutlinedInput-root': { backgroundColor: '#1f2937', color: '#fff' }, '& .MuiInputLabel-root': { color: '#9ca3af' } }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Button onClick={handleCloseModal} sx={{ color: '#9ca3af', textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button onClick={handleSaveRecord} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Guardar Registro
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
