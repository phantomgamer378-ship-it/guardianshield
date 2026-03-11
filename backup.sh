#!/bin/bash
# Backup script for GuardianShield database
mkdir -p server/db_backup
cp -r server/db/*.db* server/db_backup/
echo "Local SQLite database successfully backed up to server/db_backup/"
