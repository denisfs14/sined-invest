@echo off
echo ===============================
echo ATUALIZANDO SINED INVEST...
echo ===============================

git add .
git commit -m "update automatico"
git push

echo ===============================
echo DEPLOY ENVIADO PARA O VERCEL!
echo ===============================
pause