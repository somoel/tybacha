create table if not exists foto_perfil_usuario
(
    id_usuario      bigint primary key,
    foto_binaria    mediumblob                               not null,
    tipo_mime       varchar(40)                              not null,
    tamano_bytes    int unsigned                             not null,
    ancho_pixeles   smallint unsigned                        null,
    alto_pixeles    smallint unsigned                        null,
    huella_sha256   char(64)                                 null,
    creado_en       datetime(3) default CURRENT_TIMESTAMP(3) not null,
    actualizado_en  datetime(3) default CURRENT_TIMESTAMP(3) not null on update CURRENT_TIMESTAMP(3),
    constraint fk_foto_perfil_usuario
        foreign key (id_usuario) references usuario (id_usuario)
            on update cascade on delete cascade
);

