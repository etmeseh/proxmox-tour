import overview from './overview.json';
import lxcCreate from './lxc-create.json';
import snapshots from './snapshots.json';
import backup from './backup.json';

// Reihenfolge = Priorität bei mehreren passenden Touren.
export const tours = [lxcCreate, snapshots, backup, overview];
