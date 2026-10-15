'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import BreadcrumbsMui from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import Box from '@mui/material/Box';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import { getBreadcrumbs } from '../modules/module-registry';

export function Breadcrumbs() {
  const pathname = usePathname() || '/';
  const crumbs = getBreadcrumbs(pathname);

  return (
    <BreadcrumbsMui
      separator={<NavigateNextIcon fontSize="small" sx={{ color: '#C8A99B' }} />}
      aria-label="breadcrumb"
      sx={{
        '& .MuiBreadcrumbs-ol': {
          alignItems: 'center',
        },
      }}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const isFirst = index === 0;

        if (isLast) {
          return (
            <Typography
              key={crumb.path}
              variant="body2"
              sx={{
                color: '#FF6B00',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {crumb.title}
            </Typography>
          );
        }

        return (
          <Box
            key={crumb.path}
            component={Link}
            href={crumb.path}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: '#667085',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 500,
              transition: 'color 0.15s ease',
              '&:hover': {
                color: '#2D1B17',
              },
            }}
          >
            {isFirst && <HomeRoundedIcon sx={{ fontSize: 16, color: '#FF6B00' }} />}
            {crumb.title}
          </Box>
        );
      })}
    </BreadcrumbsMui>
  );
}
