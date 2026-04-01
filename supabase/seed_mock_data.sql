-- ============================================================
-- AC Operations (Sejuk Sejuk) — 20 Mock Orders
-- Generated: 2026-04-01
-- ============================================================
-- Inserts 20 orders into the `orders` table using existing
-- technicians from migration 001. Uses the order-number
-- format {PREFIX}{DDMM}-{SEQ} (e.g. REP0104-001).
--
-- Status spread: new(4), assigned(4), in_progress(3),
--   job_done(3), reviewed(3), closed(3)
-- Service types: repair, service, installation
-- ============================================================

INSERT INTO orders (
    id,
    order_no,
    customer_name,
    customer_phone,
    customer_address,
    problem_description,
    service_type,
    quoted_price,
    technician_id,
    status,
    work_done,
    extra_charges,
    remarks,
    final_amount,
    photo_urls
) VALUES

-- ── NEW (4) ─────────────────────────────────────────────────

(
    'bbbb0001-0001-0001-0001-000000000001',
    'REP0104-001',
    'Kamal bin Hassan',
    '+6012-87654321',
    'No. 3, Jalan Merdeka, Ampang',
    'AC berbunyi kuat bila hidup',
    'repair',
    180.00,
    NULL,
    'new',
    NULL, 0.00, NULL, NULL, '{}'
),
(
    'bbbb0002-0002-0002-0002-000000000002',
    'REP0104-002',
    'Nur Aisyah binti Mohamed',
    '+6013-56789012',
    'A-2-3 Pangsapuri Sri Puteri, Cheras',
    'AC tidak mau hidup langsung',
    'repair',
    250.00,
    NULL,
    'new',
    NULL, 0.00, NULL, NULL, '{}'
),
(
    'bbbb0003-0003-0003-0003-000000000003',
    'SER0104-001',
    'Tan Wei Ming',
    '+6016-23456789',
    'No. 15, Jalan SS2/72, Petaling Jaya',
    'Servis tahunan AC daikin 1.5HP',
    'service',
    130.00,
    NULL,
    'new',
    NULL, 0.00, NULL, NULL, '{}'
),
(
    'bbbb0004-0004-0004-0004-000000000004',
    'INS0104-001',
    'Rajesh a/l Muthu',
    '+6017-98765432',
    'No. 28, Jalan Ipoh, Kuala Lumpur',
    'Pasang AC baru di bilik tidur',
    'installation',
    400.00,
    NULL,
    'new',
    NULL, 0.00, NULL, NULL, '{}'
),

-- ── ASSIGNED (4) ────────────────────────────────────────────

(
    'bbbb0005-0005-0005-0005-000000000005',
    'REP0104-003',
    'Fatimah binti Abdullah',
    '+6011-22334455',
    'No. 7, Jalan Taman Segar, Cheras',
    'AC bocor air di dinding',
    'repair',
    200.00,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'assigned',
    NULL, 0.00, NULL, NULL, '{}'
),
(
    'bbbb0006-0006-0006-0006-000000000006',
    'SER0104-002',
    'Lim Siew Lan',
    '+6012-33445566',
    'B-5-8 Vista Commonwealth, KL',
    'Servis berkala AC panasonic 2HP',
    'service',
    150.00,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'assigned',
    NULL, 0.00, NULL, NULL, '{}'
),
(
    'bbbb0007-0007-0007-0007-000000000007',
    'INS0104-002',
    'Mohd Farid bin Ismail',
    '+6019-11223344',
    'No. 42, Jalan Kuchai Lama, Kuchai',
    'Install AC cassette di pejabat',
    'installation',
    850.00,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'assigned',
    NULL, 0.00, NULL, NULL, '{}'
),
(
    'bbbb0008-0008-0008-0008-000000000008',
    'REP0104-004',
    'Samantha a/p Rajan',
    '+6014-55667788',
    'No. 10, Jalan USJ 4/1, Subang Jaya',
    'AC bau busuk bila digunakan',
    'repair',
    160.00,
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'assigned',
    NULL, 0.00, NULL, NULL, '{}'
),

-- ── IN_PROGRESS (3) ─────────────────────────────────────────

(
    'bbbb0009-0009-0009-0009-000000000009',
    'REP0104-005',
    'Chong Fatt',
    '+6016-77889900',
    'No. 9, Jalan Gasing, Petaling Jaya',
    'AC invertor kurang sejuk',
    'repair',
    220.00,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'in_progress',
    NULL, 0.00, NULL, NULL, '{}'
),
(
    'bbbb0010-0010-0010-0010-000000000010',
    'SER0104-003',
    'Norsila binti Othman',
    '+6013-88990011',
    'No. 17, Jalan Prima BJ, Bangi',
    'Servis penuh 3 unit AC',
    'service',
    350.00,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'in_progress',
    NULL, 0.00, NULL, NULL, '{}'
),
(
    'bbbb0011-0011-0011-0011-000000000011',
    'INS0104-003',
    'Aminah binti Daud',
    '+6018-99001122',
    'No. 22, Jalan Pandan Indah, Pandan',
    'Pasang AC di ruang tamu dan bilik tidur',
    'installation',
    700.00,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'in_progress',
    NULL, 0.00, NULL, NULL, '{}'
),

-- ── JOB_DONE (3) ────────────────────────────────────────────

(
    'bbbb0012-0012-0012-0012-000000000012',
    'REP0104-006',
    'David Wong',
    '+6012-12349876',
    'No. 5, Jalan PJU 1/37, Damansara',
    'AC mati sendiri selepas 30 minit',
    'repair',
    190.00,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'job_done',
    'Ganti thermostat dan top up gas R32',
    25.00,
    'Gas R32 tambahan 25kg',
    215.00,
    ARRAY['https://example.com/photos/job-0012a.jpg']
),
(
    'bbbb0013-0013-0013-0013-000000000013',
    'SER0104-004',
    'Haji Idris bin Haji Ahmad',
    '+6017-56781234',
    'No. 30, Jalan Mewah, Ampang',
    'Servis tahunan AC multi-split',
    'service',
    280.00,
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'job_done',
    'Cuci filter, sembur chemical, periksa gas',
    0.00,
    'Servis biasa tiada caj tambahan',
    280.00,
    ARRAY['https://example.com/photos/job-0013a.jpg', 'https://example.com/photos/job-0013b.jpg']
),
(
    'bbbb0014-0014-0014-0014-000000000014',
    'INS0104-004',
    'Siti Aminah',
    '+6019-34567890',
    'No. 14, Jalan Bukit Jelutong, Shah Alam',
    'Install AC york 1HP bilik tidur',
    'installation',
    380.00,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'job_done',
    'Pasang bracket, piping 12ft, wiring',
    50.00,
    'Piping tambahan 12 kaki',
    430.00,
    ARRAY['https://example.com/photos/job-0014a.jpg']
),

-- ── REVIEWED (3) ────────────────────────────────────────────

(
    'bbbb0015-0015-0015-0015-000000000015',
    'REP0104-007',
    'Mei Ling',
    '+6016-45678901',
    'No. 8, Jalan Kelana Jaya, Petaling Jaya',
    'AC bergetar kuat dan berisik',
    'repair',
    170.00,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'reviewed',
    'Tukar fan motor dan cuci blower',
    80.00,
    'Fan motor pengganti OEM',
    250.00,
    ARRAY['https://example.com/photos/job-0015a.jpg']
),
(
    'bbbb0016-0016-0016-0016-000000000016',
    'SER0104-005',
    'Ahmad Faizal bin Zainal',
    '+6011-67890123',
    'No. 19, Jalan Seksyen 7, Shah Alam',
    'Servis AC 5 unit di pejabat',
    'service',
    500.00,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'reviewed',
    'Servis kesemua 5 unit, 2 unit perlu top up gas',
    60.00,
    'Top up gas untuk 2 unit',
    560.00,
    ARRAY['https://example.com/photos/job-0016a.jpg', 'https://example.com/photos/job-0016b.jpg', 'https://example.com/photos/job-0016c.jpg']
),
(
    'bbbb0017-0017-0017-0017-000000000017',
    'INS0104-005',
    'Priya a/p Subramaniam',
    '+6013-78901234',
    'C-3-5 Apartment Sri Rampai, Setapak',
    'Install 2 unit AC di apartment baru',
    'installation',
    750.00,
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'reviewed',
    'Install 2 unit dengan piping dan drainage',
    0.00,
    'Harga termasuk piping standard',
    750.00,
    ARRAY['https://example.com/photos/job-0017a.jpg', 'https://example.com/photos/job-0017b.jpg']
),

-- ── CLOSED (3) ──────────────────────────────────────────────

(
    'bbbb0018-0018-0018-0018-000000000018',
    'REP0104-008',
    'Rosli bin Karim',
    '+6012-89012345',
    'No. 33, Jalan Seri Kembangan, Seri Kembangan',
    'AC water leak dari indoor unit',
    'repair',
    150.00,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'closed',
    'Clear drainage pipe dan cuci coil indoor',
    0.00,
    'Tiada bahagian rosak',
    150.00,
    ARRAY['https://example.com/photos/job-0018a.jpg']
),
(
    'bbbb0019-0019-0019-0019-000000000019',
    'SER0104-006',
    'Ong Tee Keat',
    '+6018-01234567',
    'No. 6, Jalan Wangsa Maju, Wangsa Maju',
    'Servis AC 3 bulan sekali',
    'service',
    120.00,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'closed',
    'Cuci filter dan coil, sembur chemical wash',
    0.00,
    'Servis rutin berjalan lancar',
    120.00,
    ARRAY['https://example.com/photos/job-0019a.jpg']
),
(
    'bbbb0020-0020-0020-0020-000000000020',
    'INS0104-006',
    'Zulkifli bin Mat',
    '+6019-23456789',
    'No. 11, Jalan Bandar Puchong, Puchong',
    'Pasang AC inverter daikin 2HP di bilik tamu',
    'installation',
    600.00,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'closed',
    'Pasang unit indoor+outdoor, piping 15ft, wiring',
    30.00,
    'Piping tambahan 3 kaki',
    630.00,
    ARRAY['https://example.com/photos/job-0020a.jpg', 'https://example.com/photos/job-0020b.jpg']
);
