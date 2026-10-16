'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import SchemaRoundedIcon from '@mui/icons-material/SchemaRounded';
import { ModuleStateContainer } from '../../components/ModuleStateContainer';

export default function MicroservicesStudioPage() {
  const [state] = React.useState<'success'>('success');

  const topologies = [
    {
      id: 'stack-ecommerce-01',
      name: 'Stack E-Commerce Velupi',
      status: 'HEALTHY',
      components: 3,
      nodes: [
        { name: 'Storefront (Next.js 15)', type: 'Frontend', port: 3000, status: 'RUNNING' },
        { name: 'Core API (NestJS)', type: 'Backend', port: 4000, status: 'RUNNING' },
        { name: 'Postgres & Redis Data Plane', type: 'Database / Cache', port: 5432, status: 'ACTIVE' },
      ],
      lastDeployment: 'Hace 12 minutos',
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <HubRoundedIcon sx={{ color: '#FF6B00', fontSize: '2rem' }} /> Microservices Studio
          </Typography>
          <Typography variant="body1" sx={{ color: '#667085' }}>
            Diseño gráfico, orquestación distribuida y despliegue declarativo de arquitecturas multicomponente en Velupi Cloud.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<SchemaRoundedIcon />} sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#F2E8DC', color: '#2D1B17', backgroundColor: '#FFFFFF', '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFFDF9' } }}>
            Importar Blueprint
          </Button>
          <Button variant="contained" startIcon={<AddRoundedIcon />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}>
            Nuevo Stack
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <ModuleStateContainer state={state} emptyTitle="No hay topologías de microservicios" emptyMessage="Diseña tu primer grafo de microservicios para orquestar contenedores conectados.">
        <Grid container spacing={3}>
          {topologies.map((stack) => (
            <Grid item xs={12} key={stack.id}>
              <Paper
                sx={{
                  p: 3,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 3,
                  border: '1px solid #F2E8DC',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LayersRoundedIcon sx={{ color: '#FF6B00', fontSize: '1.75rem' }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D1B17' }}>
                        {stack.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#667085' }}>
                        ID: {stack.id} &bull; Último despliegue: {stack.lastDeployment}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Chip label={stack.status} size="small" sx={{ backgroundColor: '#D1FAE5', color: '#065F46', fontWeight: 600 }} />
                    <Button size="small" variant="outlined" startIcon={<PlayArrowRoundedIcon />} sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#F2E8DC', color: '#2D1B17', '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFF8ED' } }}>
                      Re-desplegar Grafo
                    </Button>
                  </Box>
                </Box>

                {/* Graph preview nodes */}
                <Typography variant="caption" sx={{ color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, mb: 1.5, display: 'block' }}>
                  Nodos del Grafo Conectados ({stack.components})
                </Typography>
                <Grid container spacing={2}>
                  {stack.nodes.map((node) => (
                    <Grid item xs={12} md={4} key={node.name}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: '#FFFDF9',
                          border: '1px solid #F2E8DC',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D1B17' }}>
                            {node.name}
                          </Typography>
                          <Chip label={node.type} size="small" sx={{ fontSize: '0.65rem', height: 20, backgroundColor: '#FFF4E5', color: '#FF6B00' }} />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#667085', display: 'block' }}>
                          Puerto Interno: {node.port}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600 }}>
                          &bull; {node.status}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </ModuleStateContainer>
    </Box>
  );
}
