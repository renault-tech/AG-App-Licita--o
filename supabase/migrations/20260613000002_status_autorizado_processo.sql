-- Adiciona o valor 'autorizado' ao enum status_documento
-- Permite distinguir entre processo autorizado (aguardando publicacao) e publicado
alter type status_documento add value if not exists 'autorizado' before 'publicado';
