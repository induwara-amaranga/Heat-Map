CREATE DATABASE IF NOT EXISTS heatmap_db;
-- Create buildings table
CREATE TABLE buildings (
    building_id VARCHAR(10) PRIMARY KEY,   -- Auto-increment primary key
    building_name VARCHAR(100) NOT NULL,
    building_capacity INT NOT NULL CHECK (building_capacity > 0)
);

INSERT INTO buildings (building_id, building_name, building_capacity) VALUES
('B1',  'Engineering Carpentry Shop', 25),
('B2',  'Engineering Workshop', 60),
('B3',  '', 100),
('B4',  'Generator Room', 10),
('B5',  '', 100),
('B6',  'Structure Lab', 50),
('B7',  'Administrative Building', 100),
('B8',  'Canteen', 30),
('B9',  'Lecture Room 10/11', 80),
('B10', 'Engineering Library', 120),
('B11', 'Department of Chemical and process Engineering', 80),
('B12', 'Security Unit', 20),
('B13', 'Drawing Office 2', 60),
('B14', 'Faculty Canteen', 30),
('B15', 'Department of Manufacturing and Industrial Engineering', 30),
('B16', 'Professor E.O.E. Perera Theater', 200),
('B17', 'Electronic Lab', 35),
('B18', 'Washrooms', 100),
('B19', 'Electrical and Electronic Workshop', 45),
('B20', 'Department of Computer Engineering', 30),
('B21', '', 50),
('B22', 'Environmental Lab', 30),
('B23', 'Applied Mechanics Lab', 30),
('B24', 'New Mechanics Lab', 35),
('B25', '', 50),
('B26', '', 50),
('B27', '', 50),
('B28', 'Materials Lab', 40),
('B29', 'Thermodynamics Lab', 40),
('B30', 'Fluids Lab', 50),
('B31', 'Surveying and Soil Lab', 70),
('B32', 'Department of Engineering Mathematics', 120),
('B33', 'Drawing Office 1', 50),
('B34', 'Department of Electrical and Electronic Engineering ', 150)



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
