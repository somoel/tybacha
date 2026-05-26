-- Relacion formal profesional -> cuidadores.
-- Un profesional puede tener muchos cuidadores, pero un cuidador solo puede
-- tener una asignacion activa a un profesional.

update usuario c
    left join usuario p
    on p.id_usuario = c.id_profesional_supervisor
        and p.rol = 'profesional'
set c.id_profesional_supervisor = null
where c.id_profesional_supervisor is not null
  and p.id_usuario is null;

create table if not exists profesional_cuidador
(
    id_profesional_cuidador bigint auto_increment
        primary key,
    id_profesional          bigint                                                     not null,
    id_cuidador             bigint                                                     not null,
    asignado_por            bigint                                                     null,
    estado                  enum ('activa', 'finalizada') default 'activa'             not null,
    fecha_inicio            date                                                       not null,
    fecha_fin               date                                                       null,
    motivo_finalizacion     varchar(255)                                               null,
    id_cuidador_activo      bigint                                                     null,
    creado_en               datetime(3)                   default CURRENT_TIMESTAMP(3) not null,
    actualizado_en          datetime(3)                   default CURRENT_TIMESTAMP(3) not null on update CURRENT_TIMESTAMP(3),

    constraint uk_profesional_cuidador_activo
        unique (id_cuidador_activo),

    constraint fk_profesional_cuidador_profesional
        foreign key (id_profesional) references usuario (id_usuario)
            on update cascade on delete cascade,

    constraint fk_profesional_cuidador_cuidador
        foreign key (id_cuidador) references usuario (id_usuario)
            on update cascade on delete cascade,

    constraint fk_profesional_cuidador_asignado_por
        foreign key (asignado_por) references usuario (id_usuario)
            on update cascade on delete set null
);

create index if not exists idx_profesional_cuidador_profesional
    on profesional_cuidador (id_profesional, estado);

create index if not exists idx_profesional_cuidador_cuidador
    on profesional_cuidador (id_cuidador, estado);

insert into profesional_cuidador
(
    id_profesional,
    id_cuidador,
    asignado_por,
    estado,
    fecha_inicio,
    id_cuidador_activo
)
select
    c.id_profesional_supervisor,
    c.id_usuario,
    c.id_profesional_supervisor,
    'activa',
    current_date(),
    c.id_usuario
from usuario c
         join usuario p
              on p.id_usuario = c.id_profesional_supervisor
                  and p.rol = 'profesional'
where c.rol = 'cuidador'
  and c.id_profesional_supervisor is not null
on duplicate key update
                     id_profesional = values(id_profesional),
                     asignado_por = values(asignado_por),
                     estado = 'activa',
                     fecha_fin = null,
                     motivo_finalizacion = null,
                     id_cuidador_activo = values(id_cuidador_activo);

alter table usuario
    add constraint fk_usuario_profesional_supervisor
        foreign key (id_profesional_supervisor) references usuario (id_usuario)
            on update cascade on delete set null;
