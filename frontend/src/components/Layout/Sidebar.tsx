import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar,
  Divider, Typography, Box, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import BuildIcon from '@mui/icons-material/Build';
import LandscapeIcon from '@mui/icons-material/Landscape';
import ParkIcon from '@mui/icons-material/Park';
import OilBarrelIcon from '@mui/icons-material/OilBarrel';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CompareIcon from '@mui/icons-material/Compare';

const DRAWER_WIDTH = 280;

interface MenuItemType {
  text: string;
  icon: React.ReactNode;
  path: string;
  divider?: boolean;
}

const menuItems: (MenuItemType | { divider: boolean })[] = [
  { text: 'Компании', icon: <BusinessIcon />, path: '/companies' },
  { text: 'Подрядчики', icon: <BuildIcon />, path: '/contractors' },
  { text: 'Месторождения', icon: <LandscapeIcon />, path: '/oilfields' },
  { text: 'Кусты', icon: <ParkIcon />, path: '/pads' },
  { text: 'Скважины', icon: <OilBarrelIcon />, path: '/wells' },
  { text: 'Загрузка ГТИ', icon: <UploadFileIcon />, path: '/gti' },
  { divider: true },
  { text: 'Аналитика', icon: <AssessmentIcon />, path: '/analytics' },
  { text: 'Сравнение', icon: <CompareIcon />, path: '/comparison' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const location = useLocation();

  const isSelected = (path: string) => location.pathname === path;

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: DRAWER_WIDTH }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" color="primary">
            📋 Меню
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        <List>
          {menuItems.map((item, idx) => {
            if ('divider' in item) {
              return <Divider key={idx} />;
            }
            const menuItem = item as MenuItemType;
            return (
              <ListItem
                key={menuItem.text}
                component={Link}
                to={menuItem.path}
                onClick={onClose}
                sx={{
                  bgcolor: isSelected(menuItem.path) ? '#1a73e8' : 'transparent',
                  color: isSelected(menuItem.path) ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: isSelected(menuItem.path) ? '#1557b0' : 'action.hover',
                  },
                  '& .MuiListItemIcon-root': {
                    color: isSelected(menuItem.path) ? 'white' : 'inherit',
                  },
                }}
              >
                <ListItemIcon>{menuItem.icon}</ListItemIcon>
                <ListItemText primary={menuItem.text} />
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};
