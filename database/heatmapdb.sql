CREATE DATABASE IF NOT EXISTS heatmap_db;
-- Create buildings table
CREATE TABLE buildings (
    building_id VARCHAR(10) PRIMARY KEY,   -- Auto-increment primary key
    building_name VARCHAR(100) NOT NULL,
    building_capacity INT NOT NULL CHECK (building_capacity > 0)
);

INSERT INTO buildings (building_id, building_name, building_capacity) VALUES
('C9', 'Department of Computer Engineering', 60),
('C10', 'Electrical and Electronic Workshop', 45),
('B1', 'Department of Chemical and Process Engineering', 80),
('C8', 'Department of Electrical and Electronic Engineering', 150),
('B2', 'Mathematics/Management/Computing Centre', 120),
('C11/C12', 'Surveying/Soil Lab', 40),
('C13', 'Materials Lab', 40),
('D16/D17', 'New/Applied Mechanics Labs', 35),
('D18', 'Thermodynamics Lab', 40),
('D20/D21', 'Engineering Workshop/Engineering Carpentry Shop', 50),
('A22', 'Drawing Office 2', 60),
('A25', 'Structures Laboratory', 50),
('D15', 'Fluids Lab', 50),
('B3', 'Drawing Office 1', 50),
('B4', 'Professor E.O.E. Pereira Theatre', 200),
('B5', 'Administrative Building', 100),
('B6', 'Security Unit', 20),
('A28', 'Department of Manufacturing and Industrial Engineering', 60);




-- Create current_status table
CREATE TABLE current_status (
       -- Unique row identifier
    building_id VARCHAR(10) NOT NULL PRIMARY KEY,
    current_crowd INT NOT NULL CHECK (current_crowd >= 0),
    color VARCHAR(20),
    status_timestamp VARCHAR(50) DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    CONSTRAINT fk_building
        FOREIGN KEY (building_id) 
        REFERENCES buildings(building_id)
        ON DELETE CASCADE
);
