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
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import { ModuleStateContainer } from '../../components/ModuleStateContainer';

export default function FileManagerPage() {
  const [state] = React.useState<'success'>('success');

  const files = [
    { name: 'public_html', type: 'folder', size: '—', permissions: '0755', updated: '2026-10-13 18:22' },
    { name: 'wp-config.php', type: 'file', size: '3.4 KB', permissions: '0600', updated: '2026-10-13 18:30' },
    { name: '.htaccess', type: 'file', size: '280 B', permissions: '0644', updated: '2026-10-13 18:20' },
    { name: 'logs', type: 'folder', size: '—', permissions: '0750', updated: '2026-10-14 02:00' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FolderSharedRoundedIcon sx={{ color: '#06b6d4', fontSize: '2rem' }} /> File Manager
          </Typography>
          <Typography variant="body1" sx={{ color: '#9ca3af' }}>
            Explorador de archivos web con control de permisos granular y protección frente a traversals.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<FolderRoundedIcon />} sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', color: '#d1d5db', textTransform: 'none', borderRadius: '8px' }}>
            Nueva Carpeta
          </Button>
          <Button variant="contained" color="primary" startIcon={<UploadFileRoundedIcon />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            Subir Archivo
          </Button>
        </Box>
      </Box>

      <ModuleStateContainer state={state}>
        <Paper sx={{ backgroundColor: '#111827', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityRoundedIcon fontSize="small" sx={{ color: '#10b981' }} />
            <Typography variant="body2" sx={{ color: '#9ca3af', fontFamily: 'monospace' }}>
              Ruta segura: /home/velupi/web/velupi.com/
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem', borderColor: 'rgba(255, 255, 255, 0.06)' } }}>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Tamaño</TableCell>
                  <TableCell>Permisos</TableCell>
                  <TableCell>Última Modificación</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.name} sx={{ '& td': { color: '#e5e7eb', borderColor: 'rgba(255, 255, 255, 0.04)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {file.type === 'folder' ? (
                          <FolderRoundedIcon sx={{ color: '#38bdf8' }} />
                        ) : (
                          <InsertDriveFileRoundedIcon sx={{ color: '#9ca3af' }} />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {file.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{file.size}</TableCell>
                    <TableCell>
                      <Chip label={file.permissions} size="small" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.05)' }} />
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', fontSize: '0.85rem' }}>{file.updated}</TableCell>
                    <TableCell align="right">
                      <Button size="small" sx={{ textTransform: 'none', color: '#06b6d4', fontWeight: 600 }}>
                        {file.type === 'folder' ? 'Abrir' : 'Editar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </ModuleStateContainer>
    </Box>
  );
}
