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
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FolderSharedRoundedIcon sx={{ color: '#FF6B00', fontSize: '2rem' }} /> File Manager
          </Typography>
          <Typography variant="body1" sx={{ color: '#667085' }}>
            Explorador de archivos web con control de permisos granular y protección frente a traversals.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<FolderRoundedIcon />} sx={{ borderColor: '#F2E8DC', color: '#2D1B17', backgroundColor: '#FFFFFF', textTransform: 'none', borderRadius: 2, '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFFDF9' } }}>
            Nueva Carpeta
          </Button>
          <Button variant="contained" startIcon={<UploadFileRoundedIcon />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}>
            Subir Archivo
          </Button>
        </Box>
      </Box>

      <ModuleStateContainer state={state}>
        <Paper sx={{ backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #F2E8DC', display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#FFFDF9' }}>
            <SecurityRoundedIcon fontSize="small" sx={{ color: '#10B981' }} />
            <Typography variant="body2" sx={{ color: '#667085', fontFamily: 'monospace' }}>
              Ruta segura: /home/velupi/web/velupi.com/
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#FAF6F0', '& th': { color: '#667085', fontWeight: 700, fontSize: '0.8rem', borderColor: '#F2E8DC' } }}>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Tamaño</TableCell>
                  <TableCell>Permisos</TableCell>
                  <TableCell>Última Modificación</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.name} sx={{ '& td': { color: '#2D1B17', borderColor: '#F2E8DC' }, '&:hover': { backgroundColor: '#FFFDF9' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {file.type === 'folder' ? (
                          <FolderRoundedIcon sx={{ color: '#FFB800' }} />
                        ) : (
                          <InsertDriveFileRoundedIcon sx={{ color: '#9CA3AF' }} />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D1B17' }}>
                          {file.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#667085' }}>{file.size}</TableCell>
                    <TableCell>
                      <Chip label={file.permissions} size="small" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', backgroundColor: '#F3F4F6', color: '#374151' }} />
                    </TableCell>
                    <TableCell sx={{ color: '#667085', fontSize: '0.85rem' }}>{file.updated}</TableCell>
                    <TableCell align="right">
                      <Button size="small" sx={{ textTransform: 'none', color: '#FF6B00', fontWeight: 600, '&:hover': { backgroundColor: '#FFF8ED' } }}>
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
