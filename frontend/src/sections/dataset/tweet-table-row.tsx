import { format } from 'date-fns'; // Import for date formatting
import PropTypes from 'prop-types'; // Import PropTypes
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link'; // Import Link from Material-UI
import Avatar from '@mui/material/Avatar';
import Popover from '@mui/material/Popover';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import MenuList from '@mui/material/MenuList';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';

import { Label } from 'src/components/label'; // Assuming you still use Label for status or other tags
import { Iconify } from 'src/components/iconify'; // Assuming you still use Iconify

// ----------------------------------------------------------------------

// Using the TweetProps you've already defined
export type TweetProps = {
  id: string;
  tweet: string;
  username: string;
  created_at: string; // Can be an ISO string or Date object
  likes_count: number;
  retweets_count: number;
  replies_count: number;
  photoUrl?: string; // Optional: URL of the tweet user's profile photo
  link?: string; // Optional: Link to the tweet
};

type TweetTableRowProps = {
  row: TweetProps;
  selected: boolean;
  onSelectRow: () => void;
  onEditTweet?: (id: string) => void;
  onDeleteTweet?: (id: string) => void;
};

export function TweetTableRow({ // Make sure 'export' is here
  row,
  selected,
  onSelectRow,
  onEditTweet,
  onDeleteTweet,
}: TweetTableRowProps) {
  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);

  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setOpenPopover(event.currentTarget);
  }, []);

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleEdit = useCallback(() => {
    handleClosePopover();
    if (onEditTweet) {
      onEditTweet(row.id);
    }
  }, [onEditTweet, row.id, handleClosePopover]);

  const handleDelete = useCallback(() => {
    handleClosePopover();
    if (onDeleteTweet) {
      onDeleteTweet(row.id);
    }
  }, [onDeleteTweet, row.id, handleClosePopover]);

  const formattedDate = row.created_at
    ? format(new Date(row.created_at), 'dd MMM yyyy, HH:mm')
    : 'N/A';

  return (
    <>
      <TableRow hover tabIndex={-1} role="checkbox" selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox disableRipple checked={selected} onChange={onSelectRow} />
        </TableCell>

        <TableCell component="th" scope="row">
          <Box
            sx={{
              gap: 2,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Avatar alt={row.username} src={row.photoUrl || '/assets/images/avatars/avatar_default.jpg'} />
            {row.username}
          </Box>
        </TableCell>

        <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Link href={row.link} target="_blank" rel="noopener" color="inherit" underline="hover">
            {row.tweet.length > 100 ? `${row.tweet.substring(0, 97)}...` : row.tweet}
          </Link>
        </TableCell>

        <TableCell>{formattedDate}</TableCell>
        <TableCell align="center">{row.likes_count}</TableCell>
        <TableCell align="center">{row.retweets_count}</TableCell>
        <TableCell align="center">{row.replies_count}</TableCell>

        <TableCell align="right">
          <IconButton onClick={handleOpenPopover}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <Popover
        open={!!openPopover}
        anchorEl={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuList
          disablePadding
          sx={{
            p: 0.5,
            gap: 0.5,
            width: 140,
            display: 'flex',
            flexDirection: 'column',
            [`& .${menuItemClasses.root}`]: {
              px: 1,
              gap: 2,
              borderRadius: 0.75,
              [`&.${menuItemClasses.selected}`]: { bgcolor: 'action.selected' },
            },
          }}
        >
          <MenuItem onClick={handleEdit}>
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>

          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>
        </MenuList>
      </Popover>
    </>
  );
}

// PropTypes for validation
TweetTableRow.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.string.isRequired,
    tweet: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    created_at: PropTypes.string.isRequired,
    likes_count: PropTypes.number.isRequired,
    retweets_count: PropTypes.number.isRequired,
    replies_count: PropTypes.number.isRequired,
    photoUrl: PropTypes.string,
    link: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool.isRequired,
  onSelectRow: PropTypes.func.isRequired,
  onEditTweet: PropTypes.func,
  onDeleteTweet: PropTypes.func,
};