@echo off
echo ===============================
echo ATUALIZANDO SINED INVEST...
echo ===============================

git add .
git commit -m "fix stripe webhook 308"
git push

echo ===============================
echo DEPLOY ENVIADO PARA O VERCEL!
echo ===============================
pause