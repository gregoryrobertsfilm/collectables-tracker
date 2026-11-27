# Collectables Tracker: database backups

One locked file per night, under `backups/<year>/`. Each is a full copy of the
database (structure and data), locked with the backup passphrase kept in Greg's
password manager. Without that passphrase the files cannot be read.

To restore, open the project in Claude Code and say:
"Something is wrong with my data. Restore from the latest backup."
