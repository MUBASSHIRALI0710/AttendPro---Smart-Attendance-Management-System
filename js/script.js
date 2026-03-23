let students =
JSON.parse(localStorage.getItem("students")) || [];

function showStudents(){

let table = document.getElementById("tableBody");

table.innerHTML="";

students.forEach((student,index)=>{

table.innerHTML +=

`
<tr>

<td>${student}</td>

<td>
<button onclick="deleteStudent(${index})">
Delete
</button>
</td>

</tr>
`;

});

document.getElementById("count").innerText =
students.length;

localStorage.setItem("students",
JSON.stringify(students));

}

function addStudent(){

let name =
document.getElementById("name").value;

students.push(name);

showStudents();

}

function deleteStudent(index){

students.splice(index,1);

showStudents();

}

showStudents();