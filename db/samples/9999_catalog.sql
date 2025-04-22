-- migrate:up

INSERT INTO public.catalog (id, name, description, price, image) VALUES (1, 'Земля', 'Описание 1', 55, null);
INSERT INTO public.catalog (id, name, description, price, image) VALUES (2, 'Вода', 'Описание 2', 65, null);
INSERT INTO public.catalog (id, name, description, price, image) VALUES (3, 'Огонь', 'Описание 3', 75, null);
INSERT INTO public.catalog (id, name, description, price, image) VALUES (4, 'Удобрение', 'Описание 4', 85, null);
INSERT INTO public.catalog (id, name, description, price, image) VALUES (5, 'Кокос', 'Описание 5', 95, null);
INSERT INTO public.catalog (id, name, description, price, image) VALUES (6, 'Земля', 'Описание 6', 105, null);
INSERT INTO public.catalog (id, name, description, price, image) VALUES (7, 'Урожай', 'Описание 7', 115, null);
INSERT INTO public.catalog (id, name, description, price, image) VALUES (8, 'Картошка', 'Описание 8', 125, null);
INSERT INTO public.catalog (id, name, description, price, image) VALUES (9, 'Морковка', 'Описание 9', 135, null);

-- migrate:down
DELETE FROM public.catalog;
