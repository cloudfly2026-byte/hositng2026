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
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Divider from '@mui/material/Divider';

// Icons
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PauseCircleOutlineRoundedIcon from '@mui/icons-material/PauseCircleOutlineRounded';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';

import { defaultApiClient } from '../../../modules/api-client';
import { useOptionalCapabilities } from '../../../modules/capabilities-context';

export default function AdminCustomersPage() {
  const optionalContext = useOptionalCapabilities();
  const capabilities = optionalContext?.capabilities;

  const [loading, setLoading] = React.useState<boolean>(true);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);

  // Snackbar notifications
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Modal states
  const [createDialogOpen, setCreateDialogOpen] = React.useState<boolean>(false);
  const [createForm, setCreateForm] = React.useState({ fullName: '', email: '', organizationName: '', password: '' });

  const [viewDialogOpen, setViewDialogOpen] = React.useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<any | null>(null);

  const [editDialogOpen, setEditDialogOpen] = React.useState<boolean>(false);
  const [editForm, setEditForm] = React.useState({ id: '', fullName: '', email: '' });

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState<boolean>(false);
  const [customerToDelete, setCustomerToDelete] = React.useState<any | null>(null);

  const isOperator = Boolean(
    capabilities?.isOperator ||
    capabilities?.role === 'SUPER_ADMIN' ||
    capabilities?.role === 'OPERATOR'
  );

  const fetchCustomers = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await defaultApiClient.listAdminCustomers();
      setCustomers(res.customers || []);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Error al cargar el listado de clientes.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Filtered customers
  const filteredCustomers = React.useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase().trim();
    return customers.filter((c) => {
      const matchEmail = c.email?.toLowerCase().includes(term);
      const matchName = c.fullName?.toLowerCase().includes(term);
      const matchOrg = c.organization?.name?.toLowerCase().includes(term);
      const matchHestia = c.linkedHestiaUser?.toLowerCase().includes(term);
      return matchEmail || matchName || matchOrg || matchHestia;
    });
  }, [customers, searchTerm]);

  // 1. Create Customer Handler
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.fullName || !createForm.organizationName) return;

    try {
      setActionLoading(true);
      await defaultApiClient.createAdminCustomer(createForm);
      setSnackbar({
        open: true,
        message: `Cliente ${createForm.email} creado exitosamente.`,
        severity: 'success',
      });
      setCreateDialogOpen(false);
      setCreateForm({ fullName: '', email: '', organizationName: '', password: '' });
      await fetchCustomers();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Error al crear el cliente.',
        severity: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 2. View Customer Handler
  const handleOpenView = async (customer: any) => {
    setSelectedCustomer(customer);
    setViewDialogOpen(true);
    try {
      const detail = await defaultApiClient.getAdminCustomer(customer.id);
      setSelectedCustomer(detail);
    } catch (err: any) {
      console.warn('Error loading customer detail:', err);
    }
  };

  // 3. Edit Customer Handler
  const handleOpenEdit = (customer: any) => {
    setEditForm({
      id: customer.id,
      fullName: customer.fullName || '',
      email: customer.email || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.id) return;

    try {
      setActionLoading(true);
      await defaultApiClient.updateAdminCustomer(editForm.id, {
        fullName: editForm.fullName,
        email: editForm.email,
      });
      setSnackbar({
        open: true,
        message: 'Datos del cliente actualizados correctamente.',
        severity: 'success',
      });
      setEditDialogOpen(false);
      await fetchCustomers();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Error al actualizar el cliente.',
        severity: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Suspend / Reactivate Handler
  const handleToggleSuspend = async (customer: any) => {
    const isSuspended = customer.status === 'SUSPENDED';
    try {
      setActionLoading(true);
      if (isSuspended) {
        await defaultApiClient.reactivateAdminCustomer(customer.id);
        setSnackbar({
          open: true,
          message: `Cliente ${customer.email} reactivado exitosamente.`,
          severity: 'success',
        });
      } else {
        await defaultApiClient.suspendAdminCustomer(customer.id);
        setSnackbar({
          open: true,
          message: `Cliente ${customer.email} ha sido suspendido.`,
          severity: 'info',
        });
      }
      await fetchCustomers();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Error al modificar el estado del cliente.',
        severity: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Deprovision / Delete Handler
  const handleOpenDelete = (customer: any) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      setActionLoading(true);
      await defaultApiClient.deprovisionAdminCustomer(customerToDelete.id);
      setSnackbar({
        open: true,
        message: `Cliente ${customerToDelete.email} y todos sus servicios han sido dados de baja definitivamente.`,
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
      await fetchCustomers();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Error al dar de baja el cliente.',
        severity: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header Banner */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <PeopleRoundedIcon sx={{ color: '#FF6B00', fontSize: '2.2rem' }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17' }}>
              Gestión de Clientes
            </Typography>
            <Chip
              label="Super Admin"
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 107, 0, 0.12)',
                color: '#FF6B00',
                fontWeight: 700,
                fontSize: '0.72rem',
              }}
            />
          </Box>
          <Typography variant="body1" sx={{ color: '#667085' }}>
            Panel de supervisión global: alta, detalle de cuentas, aprovisionamiento Hestia, suspensión y baja definitiva de clientes.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={fetchCustomers}
            disabled={loading}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              borderColor: '#F2E8DC',
              color: '#2D1B17',
              backgroundColor: '#FFFFFF',
              '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFFDF9' },
            }}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAddRoundedIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: '#FF6B00',
              boxShadow: '0 4px 12px rgba(255, 107, 0, 0.25)',
              '&:hover': { backgroundColor: '#E85A00' },
            }}
          >
            + Nuevo Cliente
          </Button>
        </Box>
      </Box>

      {/* Access Denied Warning if Not Operator */}
      {!isOperator && capabilities && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Aviso de seguridad:</strong> Este módulo es de uso exclusivo para Super Administradores y Operadores de la Plataforma.
        </Alert>
      )}

      {/* Search and Filters Bar */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: '1px solid #F2E8DC',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}
      >
        <TextField
          size="small"
          placeholder="Buscar por cliente, correo, organización o usuario..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: { xs: '100%', sm: 380 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ color: '#9E7A6E', fontSize: '1.2rem' }} />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#667085', fontWeight: 600 }}>
            Total Clientes: <strong>{filteredCustomers.length}</strong>
          </Typography>
        </Box>
      </Paper>

      {/* Main Customers Table */}
      <Paper
        sx={{
          borderRadius: 3,
          border: '1px solid #F2E8DC',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 700 }}>
            <TableHead sx={{ backgroundColor: '#FFF8ED' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#4B362F', fontSize: '0.82rem' }}>CLIENTE</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#4B362F', fontSize: '0.82rem' }}>ORGANIZACIÓN</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#4B362F', fontSize: '0.82rem' }}>USUARIO HESTIA</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#4B362F', fontSize: '0.82rem' }}>PLAN</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#4B362F', fontSize: '0.82rem' }}>ESTADO</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#4B362F', fontSize: '0.82rem' }}>ACCIONES</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#FF6B00', mb: 1.5 }} />
                    <Typography variant="body2" sx={{ color: '#667085' }}>
                      Cargando listado de clientes...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#2D1B17', mb: 0.5 }}>
                      No se encontraron clientes registrados
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#667085' }}>
                      {searchTerm ? 'Intenta modificar el término de búsqueda.' : 'Crea el primer cliente usando el botón superior.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c) => {
                  const isSuspended = c.status === 'SUSPENDED';
                  const isSuperAdmin = c.email === 'admin@velupi.com' || c.role === 'SUPER_ADMIN';

                  return (
                    <TableRow
                      key={c.id}
                      hover
                      sx={{
                        '&:hover': { backgroundColor: 'rgba(255, 107, 0, 0.02)' },
                        borderBottom: '1px solid #F2E8DC',
                      }}
                    >
                      {/* Cliente */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              backgroundColor: isSuperAdmin ? 'rgba(255, 107, 0, 0.15)' : '#F5F5F7',
                              color: isSuperAdmin ? '#FF6B00' : '#4B362F',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                            }}
                          >
                            {c.fullName ? c.fullName.charAt(0).toUpperCase() : c.email.charAt(0).toUpperCase()}
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D1B17' }}>
                              {c.fullName || 'Sin nombre'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#667085', display: 'block' }}>
                              {c.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Organización */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D1B17' }}>
                          {c.organization?.name || 'Sin organización'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9E7A6E' }}>
                          {c.organization?.slug || c.organization?.id || '—'}
                        </Typography>
                      </TableCell>

                      {/* Usuario Hestia */}
                      <TableCell>
                        {c.linkedHestiaUser ? (
                          <Chip
                            icon={<AdminPanelSettingsRoundedIcon sx={{ fontSize: '0.9rem !important' }} />}
                            label={c.linkedHestiaUser}
                            size="small"
                            sx={{
                              backgroundColor: '#F3F4F6',
                              color: '#374151',
                              fontWeight: 600,
                              fontSize: '0.72rem',
                            }}
                          />
                        ) : (
                          <Typography variant="caption" sx={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                            Sin aprovisionar
                          </Typography>
                        )}
                      </TableCell>

                      {/* Plan */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D1B17' }}>
                          {c.planName || c.planCode || 'Hosting Web'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#667085' }}>
                          Rol: {c.role || 'OWNER'}
                        </Typography>
                      </TableCell>

                      {/* Estado */}
                      <TableCell>
                        {isSuspended ? (
                          <Chip
                            label="Suspendido"
                            size="small"
                            sx={{
                              backgroundColor: '#FFF1F2',
                              color: '#9F1239',
                              fontWeight: 700,
                              fontSize: '0.70rem',
                            }}
                          />
                        ) : (
                          <Chip
                            label="Activo"
                            size="small"
                            sx={{
                              backgroundColor: '#F0FDF4',
                              color: '#166534',
                              fontWeight: 700,
                              fontSize: '0.70rem',
                            }}
                          />
                        )}
                      </TableCell>

                      {/* Botones de Acción */}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          {/* 1. Ver */}
                          <Tooltip title="Ver detalles del cliente">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenView(c)}
                              sx={{
                                color: '#4B362F',
                                '&:hover': { color: '#FF6B00', backgroundColor: 'rgba(255, 107, 0, 0.08)' },
                              }}
                            >
                              <VisibilityRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* 2. Editar */}
                          <Tooltip title="Editar perfil">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEdit(c)}
                              sx={{
                                color: '#4B362F',
                                '&:hover': { color: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.08)' },
                              }}
                            >
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* 3. Suspender / Reactivar */}
                          <Tooltip title={isSuspended ? 'Reactivar cliente y servicios' : 'Suspender cliente y servicios'}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleSuspend(c)}
                              disabled={isSuperAdmin}
                              sx={{
                                color: isSuspended ? '#16A34A' : '#D97706',
                                '&:hover': {
                                  backgroundColor: isSuspended ? 'rgba(22, 163, 74, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                                },
                              }}
                            >
                              {isSuspended ? (
                                <PlayCircleOutlineRoundedIcon fontSize="small" />
                              ) : (
                                <PauseCircleOutlineRoundedIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>

                          {/* 4. Dar de baja (Eliminar) */}
                          <Tooltip title="Dar de baja y purgar definitivamente">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDelete(c)}
                              disabled={isSuperAdmin}
                              sx={{
                                color: '#DC2626',
                                '&:hover': { color: '#B91C1C', backgroundColor: 'rgba(220, 38, 38, 0.08)' },
                              }}
                            >
                              <DeleteForeverRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal 1: Crear Cliente */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#2D1B17', display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddRoundedIcon sx={{ color: '#FF6B00' }} /> Registrar Nuevo Cliente
        </DialogTitle>
        <form onSubmit={handleCreateCustomer}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="body2" sx={{ color: '#667085' }}>
              Crea una cuenta de cliente y su organización asociada. La cuenta se verificará de inmediato.
            </Typography>
            <TextField
              label="Nombre Completo"
              required
              fullWidth
              value={createForm.fullName}
              onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
            />
            <TextField
              label="Correo Electrónico"
              type="email"
              required
              fullWidth
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
            <TextField
              label="Nombre de la Organización"
              required
              fullWidth
              placeholder="Ej: Acero Digital S.A.S"
              value={createForm.organizationName}
              onChange={(e) => setCreateForm({ ...createForm, organizationName: e.target.value })}
            />
            <TextField
              label="Contraseña Temporal (Opcional)"
              type="password"
              fullWidth
              helperText="Si se deja en blanco, el sistema generará una contraseña aleatoria."
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateDialogOpen(false)} sx={{ textTransform: 'none', color: '#667085' }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={actionLoading}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                backgroundColor: '#FF6B00',
                '&:hover': { backgroundColor: '#E85A00' },
              }}
            >
              {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Crear Cliente'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal 2: Ver Detalles */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#2D1B17', display: 'flex', alignItems: 'center', gap: 1 }}>
          <VisibilityRoundedIcon sx={{ color: '#FF6B00' }} /> Detalle del Cliente
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {selectedCustomer ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper sx={{ p: 2, backgroundColor: '#FFF8ED', borderRadius: 2, border: '1px solid #F2E8DC' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2D1B17' }}>
                  {selectedCustomer.fullName || 'Sin nombre registrado'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#667085' }}>
                  Correo: <strong>{selectedCustomer.email}</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: '#667085' }}>
                  ID Usuario: <code>{selectedCustomer.id}</code>
                </Typography>
                <Typography variant="body2" sx={{ color: '#667085' }}>
                  Organización: <strong>{selectedCustomer.organization?.name || '—'}</strong> ({selectedCustomer.organization?.id || '—'})
                </Typography>
                <Typography variant="body2" sx={{ color: '#667085' }}>
                  Usuario HestiaCP: <strong>{selectedCustomer.linkedHestiaUser || 'No aprovisionado aún'}</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: '#667085' }}>
                  Estado Actual: <strong>{selectedCustomer.status || 'ACTIVE'}</strong>
                </Typography>
              </Paper>

              {/* Sitios web asociados */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2D1B17', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LanguageRoundedIcon fontSize="small" sx={{ color: '#FF6B00' }} /> Sitios Web y Dominios Activos
                </Typography>
                {selectedCustomer.websites && selectedCustomer.websites.length > 0 ? (
                  <Paper sx={{ p: 1.5, borderRadius: 2, border: '1px solid #F2E8DC' }}>
                    {selectedCustomer.websites.map((w: any) => (
                      <Box key={w.domain} sx={{ py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F2E8DC', '&:last-child': { borderBottom: 'none' } }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{w.domain}</Typography>
                          <Typography variant="caption" sx={{ color: '#667085' }}>PHP {w.phpVersion || '8.2'} • SSL: {w.sslStatus || 'ACTIVE'}</Typography>
                        </Box>
                        <Chip label={w.status || 'HEALTHY'} size="small" color="success" />
                      </Box>
                    ))}
                  </Paper>
                ) : (
                  <Typography variant="caption" sx={{ color: '#9E7A6E', fontStyle: 'italic' }}>
                    No hay sitios web aprovisionados en el nodo Hestia para este cliente.
                  </Typography>
                )}
              </Box>
            </Box>
          ) : (
            <CircularProgress size={24} sx={{ color: '#FF6B00', mx: 'auto', my: 2 }} />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewDialogOpen(false)} variant="contained" sx={{ textTransform: 'none', backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 3: Editar Cliente */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#2D1B17', display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditRoundedIcon sx={{ color: '#2563EB' }} /> Editar Cliente
        </DialogTitle>
        <form onSubmit={handleSaveEdit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Nombre Completo"
              required
              fullWidth
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
            />
            <TextField
              label="Correo Electrónico"
              type="email"
              required
              fullWidth
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditDialogOpen(false)} sx={{ textTransform: 'none', color: '#667085' }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={actionLoading}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                backgroundColor: '#2563EB',
                '&:hover': { backgroundColor: '#1D4ED8' },
              }}
            >
              {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Guardar Cambios'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal 4: Confirmación Dar de Baja (Eliminar) */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteForeverRoundedIcon sx={{ color: '#DC2626' }} /> Confirmar Baja Definitiva
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body1" sx={{ color: '#2D1B17', fontWeight: 600 }}>
            ¿Estás absolutamente seguro de dar de baja al cliente <u>{customerToDelete?.email}</u>?
          </Typography>
          <Alert severity="error">
            <strong>Esta acción es destructiva e irreversible.</strong> Se purgará toda la infraestructura del cliente:
            <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
              <li>Usuario del sistema HestiaCP ({customerToDelete?.linkedHestiaUser || 'si existe'}) y sus directorios /home</li>
              <li>Sitios web, zonas DNS y cuentas de correo</li>
              <li>Bases de datos MariaDB y PostgreSQL asociadas</li>
              <li>Registros en la base de datos de Velupi (organización, membresías, órdenes y suscripciones)</li>
            </ul>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none', color: '#667085' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={actionLoading}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: '#DC2626',
              '&:hover': { backgroundColor: '#B91C1C' },
            }}
          >
            {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Dar de Baja Definitivamente'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
